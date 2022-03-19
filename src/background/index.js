/* eslint-disable func-names */
/* eslint-disable no-unused-vars */

import {keypairsDB, reqkeysDB, accountAddrsDB, userOptionsDB} from "./localdb";
import C,{BackgroundState} from "./constant";
import restApi from "./rest.api";
import InitAlarmNode,{KdaPriceTick, AutoLocker} from "./alarms-node";

import {
    sha512,
    aesEncrypt,  
    aesDecrypt,
    generateRandomKeypair,
    getPublicKeyFromSecretKey,
    createTabCompletely,
    isValidKey,
    StateManager
} from "./utils";

const Transfer = restApi();
const deepCopy = o => JSON.parse(JSON.stringify(o));

InitAlarmNode();
KdaPriceTick();
AutoLocker();

chrome.runtime.onInstalled.addListener(async()=>{
    let state = deepCopy(BackgroundState);
    state.networkId = (await userOptionsDB.getItem('networkId'))?.networkId??state.networkId;
    await StateManager.set(state); 
});


 async function MessageListener(message, sender = null, sendResponse = ()=>{}){
    let {type} = message;
    const setLoading = async (s = true) => {
        return await StateManager.set({
            isLoading: {
                opened: s, 
                timestamp: Date.now()
            }
        });
    }
   
    switch(type){
        case C.MSG_GET_STATE: {
            let state = await StateManager.get();
            return sendResponse(state);
        }
        case C.MSG_SET_STATE: {
            let state = await StateManager.get();
            state = {...state, ...message.value};
            return await StateManager.set(state);
        }
        case C.MSG_SAVE_PASS:{
            await setLoading(true);
            let state = await StateManager.get();
            const {password, keypairHex:{publicKey,secretKey}} = message;
            const {networkId} = state;

            if(password && publicKey && secretKey){
                const accaddr = 'k:' + publicKey;
                state.accountDetails = await getAccountDetails(accaddr, networkId);
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
                state.isLoading = {opened: false, text: null};
                state.pageNum = 8;
            }else{
                state.isLoading = {opened: false, text: null};
                sendResponse({ success: false, error: "No Passwords" });
            }
            return StateManager.set(state);
        }
        case C.MSG_VERIFY_PASSWORD: {
            if(message?.value?.password){
                await setLoading(true);
                const responds = await keypairsDB.getAll();
                const selectedAccIndex = responds.findIndex(o=>o.selected===true);
                const res = responds[selectedAccIndex];
                let state = await StateManager.get(state);

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
                        const {networkId, keypairList} = state;
                        state.password = str[0];
                        state.keypairHex = keypairList[selectedAccIndex];
                        const accaddr = 'k:' + keypairList[selectedAccIndex].publicKey;
                        state.transferOpt.senderAccountAddr = accaddr;

                        state.senderAddrList = await createSenderAddrList();
                        state.receiverAddrList = await createReceiverAddrList();
                        state.accountDetails = await getAccountDetails(accaddr, networkId);
                        state.isLoading = {opened: false, text: null};
                        state.pageNum = 8;
                    }else{
                        state.isLoading = {opened: false, text: null};
                        sendResponse({ success: false, error: 'Incorrect Password' });
                    }
                }
                return StateManager.set(state);
            }else{
                sendResponse({
                    success: false, 
                    error: 'Empty password.'
                });
            }
            break;
        }
        case C.MSG_HAS_ACCOUNT: {
            await keypairsDB.getAll().then((res)=>{
                sendResponse(res.length>0);
            })
            return true;
        }
        case C.MSG_GET_KDA_PRICE:{
            const res = await userOptionsDB.getItem('kda-price');
            sendResponse(res?.value??0);
            return true;
        }
        case C.MSG_VALIDATE_CURRENT_PASSWORD: {
            const {currentPassword} = message;
            if(currentPassword && currentPassword.length >= 8){
                let state = await StateManager.get();
                let pass1Hash = sha512(currentPassword);
                let pass2Hash = state.password;
                return sendResponse({matched: pass1Hash === pass2Hash});
            }else{
                return sendResponse({matched: false});
            }
        }
        case C.MSG_CHANGE_PASSWORD: {
            const {currentPassword, newPassword} = message;
            if(currentPassword && newPassword.length >= 8){
                await keypairsDB.getAll().then(async(responds)=>{
                    const selectedAccIndex = responds.findIndex(o=>o.selected===true);
                    const res = responds[selectedAccIndex];
                    if(res !== undefined){
                        const sha512pwd = sha512(currentPassword);
                        let state = await StateManager.get();
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
                                state = {...deepCopy(BackgroundState), pageNum: 5, networkId: state.networkId};
                                return StateManager.set(state);
                            }else{
                                return sendResponse({
                                    success: false,
                                     error: "Invalid PublicKey."
                                });
                            }
                        }else{
                            return sendResponse({
                                success: false, 
                                error: "Invalid Password."
                            });
                        }
                    }else{
                        return sendResponse({
                            success: false, 
                            error:"Get All keypairDB got some errored."
                        });
                    }
                });
            }else{
                return sendResponse({
                    success: false, 
                    error: 'Invalid Format.' 
                });
            }
            break;
        }
        case C.MSG_INIT_ACCOUNT: {
            const {accountAddr, nullChainIds} = message;
            const state = await StateManager.get();
            await Transfer.initAccountForAnyChains(accountAddr, nullChainIds, state.networkId);
            return true;
        }
        case C.MSG_CHANGE_SELECTED_ACCOUNT: {
            await setLoading(true);
            const { selectedKey } = message;
            let selectedAccIndex = null;
            let kps = await keypairsDB.getAll();
            let state = await StateManager.get();
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

            await Promise.all(kps.map((v,i)=>(keypairsDB.upsertItem(v.key, { selected: v.key === selectedKey }))));
            state.accountDetails = await getAccountDetails(accaddr, state.networkId);
            state.senderAddrList = await createSenderAddrList();
            state.receiverAddrList = await createReceiverAddrList();
            state.isLoading = {opened: false, text: null};
            return StateManager.set(state);
        }
        case C.MSG_REMOVE_ACCOUNT: {
            const { removeKey } = message;
            await keypairsDB.deleteByKey(removeKey);
            await accountAddrsDB.deleteByKey('k:' + removeKey);
            let state = {};
            state.senderAddrList = await createSenderAddrList();
            state.receiverAddrList = await createReceiverAddrList();
            state.keypairList = await createKeypairList();
            state.isLoading = {opened: false, text: null};
            state.deleteData = {
                success: null,
                privateKey: '',
                publicKey: '',
                opened: false
            }
            return StateManager.set(state);
        }
        case C.MSG_GET_PRIVATE_KEY: {
            const { password } = message;
            const sha512pwd = sha512(password||'');
            let state = await StateManager.get();

            if(sha512pwd === state.password){
                const dec = aesDecrypt(state.keypairHex.secretKey, sha512pwd);
                if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                    return sendResponse({
                        success: true, 
                        value: JSON.parse(dec).slice(1)
                    });
                }else{
                    return sendResponse({
                        success: false, 
                        error: "Decrypted Failed."
                    });
                }
            }else{
                return sendResponse({
                    success: false, 
                    error: "Invalid Password." 
                });
            }
        }
        case C.MSG_VERIFY_PRIVATE_KEY: {
            const {publicKey, privateKey} = message;
            await setLoading(true);
            await keypairsDB.getItem(publicKey).then(async(res)=>{
                const {key, enc} = res;
                if(key === publicKey) {
                    const state = await StateManager.get();
                    const dec = aesDecrypt(enc, state.password);
                    if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                        if(privateKey === JSON.parse(dec)[2]){
                            return sendResponse({success: true, error: null});
                        }else{
                            return sendResponse({ success: false, error: "Incorrect Password." });
                        }
                    }
                }else{
                    return sendResponse({ success: false, error: "PublicKey Does Not Match." });
                }
            }).catch((err)=>{
                console.error(err);
                return sendResponse({ success: false, error: "Pubkey Not Founded." })
            }).finally(()=>{
                setLoading(false);
            })
            break;
        }
        case C.MSG_IMPORT_PRIVATE_KEY:{
            const {privateKey} = message;
            
            if(isValidKey(privateKey)){
                await setLoading(true);
                let state = await StateManager.get();
                let publicKey = getPublicKeyFromSecretKey(privateKey);
                const enc = aesEncrypt(JSON.stringify([
                    state.password,
                    publicKey,
                    privateKey
                ]), state.password);

                await keypairsDB.setItem(publicKey, {enc, selected: false});
                await accountAddrsDB.setItem('k:' + publicKey, {owner: true, pubkey: publicKey});
                state.senderAddrList = await createSenderAddrList();
                state.receiverAddrList = await createReceiverAddrList();
                state.keypairList = await createKeypairList();
                state.importPriKeyPage.opened = false;
                state.isLoading = {opened: false, text: null};
                return StateManager.set(state);
            }else{
                return sendResponse({ success: false, error: 'Invalid Private Key.'});
            }
        }
        case C.MSG_LOCK_UP: {
            let state = await StateManager.get();
            state = {...deepCopy(BackgroundState), pageNum: 5, networkId: state.networkId};
            return StateManager.set(state);
        }
        case C.MSG_GET_ACCOUNT_DETAILS: {
            await setLoading(true);
            let state = await StateManager.get();
            let {networkId} = state;
            state = {};
            state.accountDetails = await getAccountDetails(message.accountId, networkId);
            state.isLoading = {opened: false, text: null};
            return StateManager.set(state);
        }
        case C.MSG_UPSERT_A_RECEIVER_ADDR: {
            let {receiverAccountAddr} = message;
            await accountAddrsDB.upsertItem(receiverAccountAddr, {
                pubkey: receiverAccountAddr.split(':')[1], 
                owner: false
            });
            let state = {};
            state.receiverAddrList = await createReceiverAddrList();
            state.transferOpt.receiverAccountAddr = receiverAccountAddr;
            return StateManager.set(state);
        }
        case C.MSG_GENERATE_RANDOM_KEYPAIR: {
            await setLoading(true);
            let state = await StateManager.get();
            const {publicKey, secretKey} = generateRandomKeypair();
            const sha512pwd = state.password;
            const enc = aesEncrypt(JSON.stringify([sha512pwd,publicKey,secretKey]), sha512pwd);

            await keypairsDB.setItem(publicKey, {enc}),
            await accountAddrsDB.setItem('k:' + publicKey, {owner: true, pubkey: publicKey});

            state = {};
            state.keypairList = await createKeypairList();
            state.senderAddrList = await createSenderAddrList();
            state.receiverAddrList = await createReceiverAddrList();
            state.isLoading = {opened: false, text: null};
            state.confirmData = {opened: false, message: null};
            return StateManager.set(state);
        }
        case C.MSG_JUST_TRANSFER: {
            await setLoading(true);
            const state = await StateManager.get();
            const dec = aesDecrypt(state.keypairHex.secretKey, state?.password??'');

            if(dec !== "%%ERROR_DECRYPT_FAILED%%"){
                let senderAccountPrivKey = JSON.parse(dec)[2];
                let transferOption = {
                    ...message.transferOpt, 
                    senderAccountPrivKey, 
                    networkId: state.networkId
                };
                await Transfer.justTransfer(transferOption);
                await StateManager.set({isLoading: {opened: false}});
            }else{
                throw 'Incorrect Password.';
            }
            return true;
        }
        case C.MSG_CONTINUE_ERROR_TRANSFER: {
            const {reqkey} = message;
            await Transfer.continueErrorTransfer(reqkey);
            return true;
        }
        case C.MSG_GET_RECENT_REQKEYS_DATA: {
            const {limit=5, offset=0} = message;
            const res = await reqkeysDB.getLastMany(limit, offset);
            return sendResponse(res);
        }
        case C.MSG_REMOVE_A_TX_RESULT: {
            const {deleteKey} = message; 
            await reqkeysDB.deleteByKey(deleteKey).then(()=>{
                sendResponse(true);
            }).catch((err)=>{
                console.error(err);
                sendResponse(false);
            });
            return true;
        }
        case C.MSG_GET_NETWORKID: {
            let state = await StateManager.get();
            state = await getUserOptions({networkId: state.networkId}, sendResponse);
            return StateManager.set(state);
        }
        case C.MSG_CHANGE_NETWORKID: {
            const {networkId} = message;
            await setLoading(true);
            let state = await StateManager.get();
            state = await setUserOptions({networkId}, sendResponse);
            const accountAddr = 'k:' + state.keypairHex.publicKey;
            state.accountDetails = await getAccountDetails(accountAddr, state.networkId);
            state.isLoading = {opened: false, text: null};
            return StateManager.set(state);
        }
        case C.MSG_GET_IDLE_LIMIT: {
            let state = await StateManager.get();
            state = await getUserOptions({idleLimit: state.idleLimit}, sendResponse);
            return StateManager(state);
        }
        case C.MSG_SET_IDLE_LIMIT: {
            const {idleLimit} = message;
            let state = await setUserOptions({idleLimit}, sendResponse);
            return StateManager.set(state);
        }
        case C.MSG_CREATE_NEW_TAB: {
            createNewTab();
            break;
        }
        
    }
}



function getUserOptions(kvo, sendResponse){
    //kvo => {key:value}
    let key = Object.keys(kvo)[0];
    let defaultValue = kvo[key];
    return userOptionsDB.getItem(key).then((value)=>{
        return value?.[key]??defaultValue;
    }).catch((err)=>{
        console.error(`${key}:> `, err);
        return null;
    })
}

function setUserOptions(kvo, sendResponse){
    let key = Object.keys(kvo)[0];
    let value = kvo[key];

    return StateManager.get().then((state)=>{
        return userOptionsDB.setItem(key, {[key]: value}).then(()=>{
            state[key] = value;
            return state;
        });
    }).catch((err)=>{
        console.error(`${key}:> `, err);
        return false;
    })
}

async function createSenderAddrList(){
    const sas = await keypairsDB.getAll();
    return sas?.map((v,i)=>({
        text: 'k:' + v.key, 
        value: 'k:' + v.key, 
        key: i+1
    })) ?? [];
}

async function createReceiverAddrList(){
    const aas = await accountAddrsDB.getAll();
    return aas?.map((v,i)=>({
        text: v.key, 
        value: v.key, 
        key: i + 1 
    })) ?? [];
}

async function createKeypairList(){
    const kps = await keypairsDB.getAll();
    return kps?.map((v)=>({
        publicKey: v.key,
        secretKey: v.enc,
        timestamp: v.timestamp,
        selected: v.selected
    })) ?? [];
}

async function getAccountDetails(accountId, networkId){
    try{
        const details = await Transfer.getAcctDetailsForAllChains(accountId, networkId);
        let sum = details.reduce((a,c,i)=>a + Math.max((c?.balance??0),0), 0); 
        let nullChainIds = details.filter(v => v.account === null).map(v => v.chainId);
        let accountDetails = {
            details, sum, nullChainIds,
            accountAddr: accountId, 
            error: null, networkId
        };  
        return accountDetails;
    }catch(err){
        throw err;
    }
}

chrome.runtime.onMessage.addListener(function(msg,sender,sendResponse){
    //console.log("message.type:", msg.type, ", message.content:", msg);
    MessageListener(msg, sender, sendResponse).catch((err)=>{
        //console.error("MessageListener - Error: ", err);
        StateManager.set({isLoading: {opened: false, text: null}});
    })
    return true;
});


chrome.storage.onChanged.addListener((changes)=>{
    let newState = Object.keys(changes).reduce((a,k,i)=>{
        a[k] = changes[k]['newValue'];
        return a;
    }, {});

    chrome.runtime.sendMessage({type: C.FMSG_SYNC_BACKGROUND_STATE, ...newState })
});



/*
chrome.action.onClicked.addListener((activeTab)=>{
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



