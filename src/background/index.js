/* eslint-disable func-names */
/* eslint-disable no-unused-vars */

import {keypairsDB, reqkeysDB, accountAddrsDB, userOptionsDB} from "./localdb";
import * as ccxt from "ccxt";
import C,{BackgroundState} from "./constant";
import restApi from "./rest.api";
import {AutoLock} from "./utils";

import {
    sha512,
    aesEncrypt,  
    aesDecrypt,
    generateRandomKeypair,
    getPublicKeyFromSecretKey,
    createTabCompletely,
    isValidKey
} from "./utils";

const Promise = window.Promise;
const Transfer = restApi();
const deepCopy = o => JSON.parse(JSON.stringify(o));

let state = deepCopy(BackgroundState);
let timex = null;
let priceTID = null;


const Init = async () => {
    getPrice();
    priceTID = setInterval(getPrice, 5000);

    state.networkId = await MessageListener({type: C.MSG_GET_NETWORKID});
    state.idleLimit = await MessageListener({type: C.MSG_GET_IDLE_LIMIT});

    timex = AutoLock(3, state.idleLimit, (t, p) => { 
        chrome.runtime.sendMessage({type: C.FMSG_LOCK_PROGRESS_STATE, value: p});
    }, () => {
        MessageListener({type: C.MSG_LOCK_UP});
    });


}

Init();


async function getPrice(){
    try{
        if(!!state.password && !!state?.keypairHex?.publicKey){
            let kucoin = new ccxt.kucoin();
            let res = await kucoin.fetchTicker('KDA/USDT');
            state.kdausdt = res?.last??0;
            chrome.runtime.sendMessage({type:C.MSG_GET_KDA_PRICE, value: res?.last??0});
        }
    }catch(err){
        clearInterval(priceTID);
        priceTID = setInterval(getPrice, 5000);
    }
}

function MessageListener(message, sender = null, sendResponse = ()=>{}){
    let {type} = message;
    let ret = null;

    if(state.password !== ""){
        timex.reset(state.idleLimit);
    }

    switch(type){
        case C.MSG_GET_STATE: {
            sendResponse(state);
            break;
        }
        case C.MSG_SET_STATE: {
            delete message.value.keypairHex;
            state = {...state, ...message.value};
            sendResponse(false);
            break;
        }
        case C.MSG_SAVE_PASS:{
            const {password, keypairHex:{publicKey,secretKey}} = message;

            if(password && publicKey && secretKey){
                const accaddr = 'k:' + publicKey;
                MessageListener({
                    type: C.MSG_GET_ACCOUNT_DETAILS,
                    accountId: accaddr
                }, {}, (accountDetails)=>{
                    if(accountDetails.error === null){
                        const sha512pwd = sha512(password);
                        const enc = aesEncrypt(JSON.stringify([
                            sha512pwd,
                            publicKey,
                            secretKey
                        ]), sha512pwd);
        
                        state.keypairHex = {};
                        state.keypairHex.publicKey = publicKey;
                        state.keypairHex.secretKey = enc;
                        state.password = sha512pwd;
                        state.transferOpt.senderAccountAddr = accaddr;
                        state.keypairList = [{
                            publicKey: publicKey,
                            secretKey: enc,
                            timestamp: Date.now(),
                            selected: true
                        }];

                        state.senderAddrList = [{ text: accaddr, value: accaddr, key: 1 }];
                        state.receiverAddrList = [{ text: accaddr, value: accaddr, key: 1 }];

                        keypairsDB.setItem(publicKey, {enc, selected: true});
                        accountAddrsDB.setItem(accaddr, {owner: true, pubkey: publicKey});
                        
                        chrome.runtime.sendMessage({
                            type: C.FMSG_SAVE_PASS_SUCCESS,
                            keypairHex: state.keypairHex,
                            password: sha512pwd,
                            transferOpt: state.transferOpt,
                            keypairList: state.keypairList,
                            accountDetails: accountDetails,
                            senderAddrList: state.senderAddrList,
                            receiverAddrList: state.receiverAddrList
                        });

                        state.isLoading = {opened: false, text: null};
                        state.pageNum = 8;
                    }
                });
            }else{
                state.isLoading = {opened: false, text: null};
                throw "NO PASSWORDS";
            }
            break;
        }
        case C.MSG_VERIFY_PASSWORD: {
            if(message?.value?.password){
                ret = keypairsDB.getAll().then((responds)=>{
                    const selectedAccIndex = responds.findIndex(o=>o.selected===true);
                    const res = responds[selectedAccIndex];
   
                    if(res !== undefined){
                        const sha512pwd = sha512(message?.value?.password??'');
                        const dec = aesDecrypt(res.enc, sha512pwd);
                        if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                            state.keypairList = responds.map((v,i)=>{
                                return {
                                    publicKey: v.key,
                                    secretKey: v.enc,
                                    timestamp: v.timestamp,
                                    selected: v.selected
                                }
                            });
                            const str = JSON.parse(dec);
                            state.password = str[0];
                            state.keypairHex = state.keypairList[selectedAccIndex];

                            const accaddr = 'k:' + state.keypairList[selectedAccIndex].publicKey;
                            state.transferOpt.senderAccountAddr = accaddr;

                            return MessageListener({ type: C.MSG_GET_SENDER_ADDR_LIST })
                                .then(()=>MessageListener({ type: C.MSG_GET_RECEIVER_ADDR_LIST }))
                                .then(()=>MessageListener({ type: C.MSG_GET_ACCOUNT_DETAILS, accountId: accaddr }))
                                .then(()=>{
                                    chrome.runtime.sendMessage({
                                        type: C.FMSG_VERIFY_PASSWORD_SUCCESS,
                                        password: str[0],
                                        keypairHex: { publicKey: str[1], secretKey: res.enc },
                                        keypairList: state.keypairList,
                                        senderAddrList: state.senderAddrList,
                                        receiverAddrList: state.receiverAddrList,
                                        transferOpt: state.transferOpt,
                                        accountDetails: state.accountDetails,
                                    });
                                    state.isLoading = {opened: false, text: null};
                                    state.pageNum = 8;
                                    sendResponse({ success: true });
                                    return { success: true };
                                }).catch((err)=>{
                                    state.isLoading = {opened: false, text: null};
                                    console.error("LOGIN GOT SOME ERROR...", err);
                                    sendResponse({ success: false, error: err });
                                    return { success: false, error: err };
                                })
                        }else{
                            state.isLoading = {opened: false, text: null};
                            const result = { success: false, error: 'Incorrect password' };
                            sendResponse(result);
                            return result;
                        }
                    }
                });
            }else{
                ret = { success: false, error: 'Empty password.' };
                sendResponse(ret);
            }
            break;
        }
        case C.MSG_HAS_ACCOUNT: {
            keypairsDB.getAll().then((res)=>{
                sendResponse(res.length>0);
            })
            break;
        }
        case C.MSG_VALIDATE_CURRENT_PASSWORD: {
            const {currentPassword} = message;
            if(currentPassword && currentPassword.length >= 8){
                let pass1Hash = sha512(currentPassword);
                let pass2Hash = state.password;
                sendResponse({matched: pass1Hash === pass2Hash});
            }else{
                sendResponse({matched: false});
            }
            break;
        }
        case C.MSG_CHANGE_PASSWORD: {
            const {currentPassword, newPassword} = message;
            if(currentPassword && newPassword.length >= 8){
                ret = keypairsDB.getAll().then((responds)=>{
                    const selectedAccIndex = responds.findIndex(o=>o.selected===true);
                    const res = responds[selectedAccIndex];
                    if(res !== undefined){
                        const sha512pwd = sha512(currentPassword);
                        if(sha512pwd === state.password){
                            const dec = aesDecrypt(res.enc, sha512pwd);
                            const decArr = JSON.parse(dec);
                            if(decArr[1] === state.keypairHex.publicKey){
                                const newPassHash = sha512(newPassword);
                                const enc = aesEncrypt(JSON.stringify([
                                    newPassHash,
                                    decArr[1],
                                    decArr[2]
                                ]), newPassHash);
                                keypairsDB.setItem(decArr[1], {enc, selected: true});
                                return MessageListener({type: C.MSG_LOCK_UP});
                            }else{
                                sendResponse({success: false, error: "Invalid PublicKey."});
                            }
                        }else{
                            sendResponse({success: false, error: "Invalid Password."});
                        }
                    }else{
                        sendResponse({success: false, error:"Get All keypairDB got some errored."});
                    }
                });
            }else{
                sendResponse({success: false, error: 'Invalid Format.' });
            }
            break;
        }
        case C.MSG_INIT_ACCOUNT: {
            const {accountAddr, nullChainIds} = message;
            ret = Transfer.initAccountForAnyChains(accountAddr, nullChainIds, state.networkId);
            break;
        }
        case C.MSG_CHANGE_SELECTED_ACCOUNT: {
            const { selectedKey } = message;
            let selectedAccIndex = null;
            ret = keypairsDB.getAll().then((kps)=>{
                state.keypairList = kps.map((v,i)=>{
                    if(v.key === selectedKey) selectedAccIndex = i;
                    return {
                        publicKey: v.key,
                        secretKey: v.enc,
                        timestamp: v.timestamp,
                        selected: v.key === selectedKey
                    }
                });

                state.keypairHex = state.keypairList[selectedAccIndex];
                const accaddr = 'k:' + state.keypairList[selectedAccIndex].publicKey;
                state.transferOpt.senderAccountAddr = accaddr;

                return Promise.all(kps.map((v,i)=>(keypairsDB.upsertItem(v.key, { selected: v.key === selectedKey }))))
                        .then(()=>MessageListener({ type: C.MSG_GET_ACCOUNT_DETAILS, accountId: accaddr }))
                        .then(()=>MessageListener({ type: C.MSG_GET_SENDER_ADDR_LIST }))
                        .then(()=>MessageListener({ type: C.MSG_GET_RECEIVER_ADDR_LIST }))
                        .then(()=>{
                            chrome.runtime.sendMessage({
                                type: C.FMSG_CHANGE_SELECTED_ACCOUNT_SUCCESS,
                                keypairHex: state.keypairHex,
                                keypairList: state.keypairList,
                                senderAddrList: state.senderAddrList,
                                receiverAddrList: state.receiverAddrList,
                                transferOpt: state.transferOpt,
                                accountDetails: state.accountDetails,
                            });
                            state.isLoading = {opened: false, text: null};
                            sendResponse({ sucess: true });
                            return { success: true };
                        }).catch((err)=>{
                            state.isLoading = {opened: false, text: null};
                            console.error("CHANGE_SELECTED_ACCOUNT GOT SOME ERROR....", err);
                            sendResponse({ success: false });
                            return { success: false, error: err };
                        });
            });
            break;
        }
        case C.MSG_REMOVE_ACCOUNT: {
            const { removeKey } = message;
            ret = keypairsDB.deleteByKey(removeKey)
                .then(()=> accountAddrsDB.deleteByKey('k:' + removeKey))
                .then(()=>MessageListener({ type: C.MSG_GET_SENDER_ADDR_LIST }))
                .then(()=>MessageListener({ type: C.MSG_GET_RECEIVER_ADDR_LIST }))
                .then(()=>MessageListener({ type:C.MSG_CREATE_KEYPAIR_LIST }))
                .then(()=>{
                    chrome.runtime.sendMessage({
                        type: C.FMSG_REMOVE_ACCOUNT_SUCCESS,
                        keypairList: state.keypairList,
                        senderAddrList: state.senderAddrList,
                        receiverAddrList: state.receiverAddrList
                    });
                    state.isLoading = {opened: false, text: null};
                    sendResponse({ sucess: true });
                    return { success: true };
                }).catch((err)=>{
                    console.error("REMOVE ACCOUNT ERRORED....", err);
                    state.isLoading = {opened: false, text: null};
                    sendResponse({ success: false });
                    return { success: false, error: err };
                });
            break;
        }
        case C.MSG_GET_PRIVATE_KEY: {
            const { password } = message;
            const sha512pwd = sha512(password||'');

            if(sha512pwd === state.password){
                const dec = aesDecrypt(state.keypairHex.secretKey, sha512pwd);
                if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                    sendResponse({success: true, value: JSON.parse(dec).slice(1)});
                }else{
                    sendResponse({ success: false, error: "Decrypted Failed." })
                }
            }else{
                sendResponse({ success: false, error: "Invalid Password." })
            }
            break;
        }
        case C.MSG_VERIFY_PRIVATE_KEY: {
            const {publicKey, privateKey} = message;
            ret = keypairsDB.getItem(publicKey).then((res)=>{
                const {key, enc} = res;
                if(key === publicKey) {
                    const dec = aesDecrypt(enc, state.password);
                    if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                        if(privateKey === JSON.parse(dec)[2]){
                            sendResponse( {success: true, error: null} )
                            return true;
                        }
                        sendResponse( {success: false, error: "Incorrect Password."} );
                        return false;
                    }
                }else{
                    sendResponse( {success: false, error: "PublicKey Does Not Match."} );
                    return false;
                }
            }).catch((err)=>{
                console.error(err);
                sendResponse( {success: false, error: "Pubkey Not Founded."})
            })
            break;
        }
        case C.MSG_IMPORT_PRIVATE_KEY:{
            const {privateKey} = message;
            
            if(isValidKey(privateKey)){
                let publicKey = getPublicKeyFromSecretKey(privateKey);
                const enc = aesEncrypt(JSON.stringify([
                    state.password,
                    publicKey,
                    privateKey
                ]), state.password);

                ret = keypairsDB.setItem(publicKey, {enc, selected: false})
                    .then(()=>accountAddrsDB.setItem('k:' + publicKey, {owner: true, pubkey: publicKey}))
                    .then(()=>MessageListener({ type: C.MSG_CREATE_KEYPAIR_LIST }))
                    .then(()=>MessageListener({ type: C.MSG_GET_SENDER_ADDR_LIST })) 
                    .then(()=>MessageListener({ type: C.MSG_GET_RECEIVER_ADDR_LIST }))
                    .then(()=>{
                        chrome.runtime.sendMessage({
                            type: C.FMSG_IMPORT_ACCOUNT_SUCCESS,
                            keypairList: state.keypairList,
                            senderAddrList: state.senderAddrList,
                            receiverAddrList: state.receiverAddrList,
                        });
                        state.isLoading = {opened: false, text: null};
                        const rt = { success: true };
                        sendResponse(rt);
                        return rt; 
                    }).catch((err)=>{
                        state.isLoading = {opened: false, text: null};
                        console.error("IMPORT PRIVATE KEY - ERRORED...", err);
                        const rt = { success: false, error: err };
                        sendResponse(rt);
                        return rt;
                    });
            }else{
                ret = { success: false, error: 'Invalid Private Key.'};
                sendResponse(ret)
            }
            break;
        }
        case C.MSG_LOCK_UP: {
            state = {...deepCopy(BackgroundState), pageNum: 5, networkId: state.networkId};
            chrome.runtime.sendMessage({type:C.FMSG_LOCK_UP_SUCCESS, ...state});
            break;
        }
        case C.MSG_CREATE_KEYPAIR_LIST: {
            ret = keypairsDB.getAll().then((rx)=>{
                return state.keypairList = rx.map((v,i)=>({
                    publicKey: v.key,
                    secretKey: v.enc,
                    timestamp: v.timestamp,
                    selected: v.selected
                }));
            });
            break;
        }
        case C.MSG_GET_ACCOUNT_DETAILS: {
            if(state.Pending[C.MSG_GET_ACCOUNT_DETAILS] === false){
                state.Pending[C.MSG_GET_ACCOUNT_DETAILS] = true;
                const ret = Transfer.getAcctDetailsForAllChains(message.accountId, state?.networkId).then((details)=>{
                    let sum = details.reduce((a,c,i)=>a + (c?.balance??0), 0); 
                    let nullChainIds = details.filter(v => v.account === null).map(v => v.chainId);
                    let accountDetails = {
                        details, 
                        sum, 
                        nullChainIds,
                        accountAddr: message.accountId,
                        error: null,
                        networkId: state.networkId
                    };         
                    state.accountDetails = accountDetails;
                    sendResponse(accountDetails);
                    return accountDetails;
                }).catch((err)=>{
                    console.error( err);
                    sendResponse({error: err});
                    return {error: err};
                }).finally(()=>{
                    state.isLoading = {opened: false, text: null};
                    state.Pending[C.MSG_GET_ACCOUNT_DETAILS] = false;
                });

                if(sender === null) return ret;
            }else{
                const errMsg = "MSG_GET_ACCOUNT_DETAILS---PENDING...";
                console.error(errMsg);
                if(sender === null) return errMsg;
            }
            break;
        }
        case C.MSG_JUST_TRANSFER: {
            //message.data ===> transferOpt
            //message.deleteKey
            //message.step
            //message.contReqkey
            const dec = aesDecrypt(state.keypairHex.secretKey, state?.password??'');
            const $step = message?.step??1;
            const $contReqkey = message.contReqkey;

            if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                let senderAccountPrivKey = JSON.parse(dec)[2];
                let d = {
                    ...message.data, 
                    senderAccountPrivKey, 
                    networkId: state.networkId
                };
                if(message.deleteKey !== undefined){
                    reqkeysDB.deleteByKey(message.deleteKey);
                }

                ret = Transfer.justTransfer(d, $step, $contReqkey).then((res)=>{
                    sendResponse(res);
                    return res;
                }).catch((err)=>{
                    console.error(err);
                    sendResponse(err);
                    return err;
                }).finally(()=>{
                    return MessageListener({
                        type: C.MSG_GET_ACCOUNT_DETAILS,
                        accountId: 'k:'+ state.keypairHex.publicKey
                    }, null, (d)=>{
                        chrome.runtime.sendMessage({
                            type: C.FMSG_ACCOUNT_DETAILS_REFRESH, 
                            data: d //d = {details:[], sum: 0}
                        });
                    })
                });
            }else{
                sendResponse({ success: false });
                ret = { success: false };
            }
            break;
        }
        case C.MSG_GET_KDA_PRICE: {
            sendResponse(state.kdausdt);
            break;
        }
        case C.MSG_GET_RECENT_REQKEYS_DATA: {
            const {limit=5, offset=0} = message;
            ret = reqkeysDB.getLastMany(limit, offset).then((res)=>{
                sendResponse(res);
            });
            break;
        }
        case C.MSG_GET_SENDER_ADDR_LIST: {
            ret = keypairsDB.getAll().then((kps)=>{
                state.senderAddrList = kps?.map((v,i)=>({
                    text: 'k:' + v.key, 
                    value: 'k:' + v.key, 
                    key: i+1
                }))??[];
                sendResponse(state.senderAddrList);
                return state.senderAddrList;
            }).catch((err)=>{
                sendResponse(err);
                return err;
            });
            break;
        }
        case C.MSG_GET_RECEIVER_ADDR_LIST: {
            ret = accountAddrsDB.getAll().then((addrs)=>{
                state.receiverAddrList = addrs?.map((v,i)=>({
                    text: v.key, 
                    value: v.key, 
                    key: i + 1 
                }))??[];
                sendResponse(state.receiverAddrList);
                return state.receiverAddrList;
            }).catch((err)=>{
                sendResponse(err);
                return err;
            });
            break;
        }
        case C.MSG_UPSERT_A_RECEIVER_ADDR: {
            let {receiverAccountAddr} = message;
            ret = accountAddrsDB.upsertItem(receiverAccountAddr, {
                pubkey: receiverAccountAddr.split(':')[1], 
                owner: false
            }).then((res)=>{
                return accountAddrsDB.getAll().then((addrs)=>{
                    state.receiverAddrList = addrs?.map((v,i)=>({
                        text: v.key, 
                        value: v.key, 
                        key: i + 1 
                    }))??[];
                    sendResponse(state.receiverAddrList);
                    return state.receiverAddrList;
                }).catch((err)=>{
                    sendResponse(err);
                    return err;
                });
            }).catch((err)=>{
                sendResponse(err);
                return err;
            });
            break;
        }
        case C.MSG_GENERATE_RANDOM_KEYPAIR: {
            const {publicKey, secretKey} = generateRandomKeypair();
            const sha512pwd = state.password;
            const enc = aesEncrypt(JSON.stringify([sha512pwd,publicKey,secretKey]), sha512pwd);

            ret = Promise.all([
                    keypairsDB.setItem(publicKey, {enc}),
                    accountAddrsDB.setItem('k:' + publicKey, {owner: true, pubkey: publicKey}),
              ]).then(()=>MessageListener({ type: C.MSG_CREATE_KEYPAIR_LIST }))
                .then(()=>MessageListener({ type: C.MSG_GET_SENDER_ADDR_LIST }))
                .then(()=>MessageListener({ type: C.MSG_GET_RECEIVER_ADDR_LIST }))
                .then(()=>{
                    chrome.runtime.sendMessage({
                        type: C.FMSG_GENERATE_RANDOM_KEYPAIR,
                        keypairList: state.keypairList,
                        senderAddrList: state.senderAddrList,
                        receiverAddrList: state.receiverAddrList
                    });
                    state.isLoading = {opened: false, text: null};
                    const rtt = {success: true};
                    sendResponse(rtt);
                    return rtt;
                }).catch((err)=>{
                    state.isLoading = {opened: false, text: null};
                    console.error(err);
                    const rtt = {success: false, error: err};
                    sendResponse(rtt);
                    return rtt;
                });
            break;
        }
        case C.MSG_REMOVE_A_TX_RESULT: {
            const {deleteKey} = message; 
            ret = reqkeysDB.deleteByKey(deleteKey).then(()=>{
                sendResponse(true);
            }).catch((err)=>{
                console.error(err);
                sendResponse(false);
            });
            break;
        }
        case C.MSG_GET_NETWORKID: {
            ret = getUserOptions({networkId: state.networkId}, sendResponse);
            break;
        }
        case C.MSG_SET_NETWORKID: {
            const {networkId} = message;
            ret = setUserOptions({networkId}, sendResponse);
            break;
        }
        case C.MSG_GET_IDLE_LIMIT: {
            ret = getUserOptions({idleLimit: state.idleLimit}, sendResponse);
            break;
        }
        case C.MSG_SET_IDLE_LIMIT: {
            const {idleLimit} = message;
            ret = setUserOptions({idleLimit}, sendResponse);
            break;
        }
        case C.MSG_CREATE_NEW_TAB: {
            createNewTab();
            break;
        }
    }

    if(sender === null) return ret;
    return true;
}


function getUserOptions(kvo, sendResponse){
    //kvo => {key:value}
    let key = Object.keys(kvo)[0];
    let defaultValue = kvo[key];
    
    return userOptionsDB.getItem(key).then((value)=>{
        const newValue = value?.[key]??defaultValue;
        sendResponse({success: true, [key]: newValue});
        return newValue;
    }).catch((err)=>{
        console.error(`${key}:> `, err);
        sendResponse({success: false, error: err});
        return null;
    })
}

function setUserOptions(kvo, sendResponse){
    let key = Object.keys(kvo)[0];
    let value = kvo[key];
    return userOptionsDB.setItem(key, {[key]: value}).then(()=>{
        state[key] = value;
        sendResponse({success: true});
        return true;
    }).catch((err)=>{
        console.error(`${key}:> `, err);
        sendResponse({success: false, error: err});
        return false;
    })
}



chrome.runtime.onMessage.addListener(MessageListener);



/*
chrome.browserAction.onClicked.addListener((activeTab)=>{
        createNewTab();
});
*/

/*
const sendMsgToActiveTag = (actionCallback)=>{
    chrome.tabs.query({ 
        //currentWindow: true, 
        //active: true 
    },(tabs)=>{
        tabs.forEach((tab,i)=>{
            actionCallback((data={})=>chrome.tabs.sendMessage(tab.id, data));
        })
    });
}
*/
const createNewTab = () => {
    //findTabAndHighlightByUrl("chrome-extension://"+chrome.runtime.id+"/contentScripts/index.html", (isExist,thetabid)=>{
    //    if(isExist){
                    
    //    }else{
            createTabCompletely({url:'contentScripts/index.html'},(tab)=>{
                        
            });
    //    }
    //});
}



