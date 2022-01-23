import createTransfer from "./transfer";
import {keypairsDB, reqkeysDB} from "./localdb";
import C from "./constant";
import {pushNoti} from "./notification";

const Promise = window.Promise;

const si = (a,b)=>localStorage.setItem(a,b);
const gi = (a)=>localStorage.getItem(a);


si('maxGasPrice', C.MAX_GAS_PRICE);
si('minGasPrice', C.MIN_GAS_PRICE);
si('maxGasLimit', C.MAX_GAS_LIMIT);
si('minGasLimit', C.MIN_GAS_LIMIT);
si('maxXGasPrice', C.MAX_X_GAS_PRICE);
si('minXGasPrice', C.MIN_X_GAS_PRICE);
si('maxXGasLimit', C.MAX_X_GAS_LIMIT);
si('minXGasLimit', C.MIN_X_GAS_LIMIT);


export default function(){
    async function samechainTransfer({
        senderAccountAddr,
        senderAccountPrivKey,
        receiverAccountAddr,
        amount,
        senderChainId,
        receiverChainId,
        gasPrice,
        gasLimit,
        networkId
    }, $step = 1, contReqkey = null){

        let crlogger = null;
        let senderReqkey = null;

        let param = {...arguments[0]};
        delete param.senderAccountPrivKey;

        gasLimit = Math.min(Math.max(+gi('minGasLimit'), +gasLimit), +gi('maxGasLimit'));
        gasPrice = Math.min(Math.max(+gi('minGasPrice'), +gasPrice), +gi('maxGasPrice'));

        let cct = createTransfer({...arguments[0], gasLimit, gasPrice});

        if($step > 1){
            //FOR CONTINUING TRANSFER
            if(contReqkey !== null){
                senderReqkey = contReqkey;
                crlogger = createReqLogger(senderReqkey, 2, param);
            }else{
                console.error("[contReqkey] is undefined.");
                return null;
            }
        }


        try{
            switch($step){
                case 1:
                    let details = await cct.getAcctDetails(receiverAccountAddr, receiverChainId);
                    let senderReqkeyResult = await cct.transferSamechain(details.guard);
                    senderReqkey = senderReqkeyResult.requestKeys[0];
                    crlogger = createReqLogger(senderReqkey, 2, param); 
                    await crlogger.set(1, senderReqkeyResult);

                case 2:
                    let senderListenResult = await cct.listenReqkey(senderReqkey, senderChainId);
                    await crlogger.set(2, senderListenResult);

                    if(senderListenResult.result.status === 'failure'){
                        throw senderListenResult.result.error.message
                    }

                return senderListenResult;
            }
        }catch(err){
            if(crlogger !== null){
                crlogger.err(err);
            }else{
                SendErrorMessage('transfer-create', 2, err, param);
            }
            
            if((err?.match(/Gas limit .* exceeded/gi)??null) !== null){
                await reqkeysDB.deleteByKey(senderReqkey);
                si('minGasLimit', +gasLimit + 100);
                return samechainTransfer({...arguments[0], gasLimit: +gasLimit + 100}, 0);
            }

            if((err?.match(/Transaction gas price .* below minimum gas price /gi)??null) !== null){
                let minGasPrice = +err.split("is below minimum gas price (")[1].slice(0,-1);
                if(isNaN(minGasPrice) === false){
                    si('minGasPrice', minGasPrice);
                    return samechainTransfer({...arguments[0], gasPrice: minGasPrice}, 0);
                }
            }

            throw err;
        }
    
    }
    
    async function crosschainTransfer({
        senderAccountAddr,
        senderAccountPrivKey,
        receiverAccountAddr,
        amount,
        senderChainId,
        receiverChainId,
        networkId,
        gasPrice = 0.00000001,
        gasLimit = 400,
        xGasPrice = 0.00000001,
        xGasLimit = 400
    }, $step = 1, contReqkey = null){

        let crlogger = null;
        let senderReqkey = null;

        let param = {...arguments[0], xGasPrice};
        delete param.senderAccountPrivKey;

        let cct = createTransfer({...arguments[0], xGasPrice});

        if($step > 1){
            //FOR CONTINUING TRANSFER
            if(contReqkey !== null){
                senderReqkey = contReqkey;
                crlogger = createReqLogger(senderReqkey, 5, param);
            }else{
                console.error("[contReqkey] is undefined.");
                return null;
            }
        }

        try{
            switch($step){
                case 1: 
                    let details = await cct.getAcctDetails(receiverAccountAddr, receiverChainId);
                    let senderReqkeyResult = await cct.transferCrosschain(details.guard);
                    
                    senderReqkey = senderReqkeyResult.requestKeys[0];
                    crlogger = createReqLogger(senderReqkey, 5, param);
                    await crlogger.set(1, senderReqkeyResult);

                case 2: 
                    let senderListenResult = await cct.listenReqkey(senderReqkey, senderChainId);
                    await crlogger.set(2, senderListenResult);

                case 3: 
                    let spvCmd = cct.createSpvCmd(senderListenResult);
                    let proof = await cct.getProof(spvCmd);
                    await crlogger.set(3, proof);

                case 4:
                    let receiverReqkeyResult = await cct.continueTransfer(senderReqkey, proof, 1, spvCmd.targetChainId);
                    await crlogger.set(4, receiverReqkeyResult);

                case 5:
                    let receiverReqkey = receiverReqkeyResult.requestKeys[0];
                    let receiverListenResult = await cct.listenReqkey(receiverReqkey, spvCmd.targetChainId);
                    await crlogger.set(5, receiverListenResult);

                return receiverListenResult;
            }
    
        }catch(err){
            if(crlogger !== null){
                crlogger.err(err);
            }else{
                SendErrorMessage('transfer-crosschain', 5, err, param);
            }

            //if((err?.match(/Gas Limit must be smaller than or equal.*/gi)??null) !== null){
            //    si('maxXGasLimit', +maxXGasLimit - 100);
            //    return crosschainTransfer({...arguments[0], maxXGasLimit: +maxXGasLimit - 100}, 0);
            //}

            throw err;
        }
    }

    
    async function justTransfer({
        senderAccountAddr,
        senderAccountPrivKey,
        receiverAccountAddr,
        amount,
        senderChainId,
        receiverChainId,
        networkId,
        xGasPrice,
        xGasLimit
    }, step, contReqkey){
        try{
            const fn = (senderChainId===receiverChainId ? samechainTransfer : crosschainTransfer);
            return await fn(arguments[0], step, contReqkey);
        }catch(err){
            throw err;
        }
    }


    async function getAcctDetailsForAllChains(accountAddr, networkId){
        let param = {accountAddr, networkId};
        try{
            let cct = createTransfer({ networkId });
            return await cct.getFullAcctDetails(accountAddr);
        }catch(err){
            SendErrorMessage('coin.details', 0, err, param);
            throw err;
        }
    }


    async function initAccountForAnyChains(accountAddr, nullChainIds = [], networkId = 'testnet04'){
        let cct = createTransfer({
            senderAccountAddr: accountAddr,
            networkId
        });

        let param = {accountAddr, nullChainIds, networkId};

        try{
            return await Promise.all(
                nullChainIds.map(cid =>
                    cct.initAccount(cid).then((r1)=>{
                        return cct.listenReqkey(r1.requestKeys[0], cid);
                    })
                )
            );
        }catch(err){
            SendErrorMessage('account.initiate', 0, err, param);

            throw err;
        }
        
    }


    function SendErrorMessage(behavior, totalstep, err, param = {}){
        chrome.runtime.sendMessage({
            type: C.FMSG_TRANSFER_PROGRESS, 
            key: null, 
            value: {
                behavior,
                step: 0, tstep: totalstep, param, responds: [], 
                success: false, finished: false, lastError: ErrorDescription(err)
            }
        });
    }
    

    return {
        getAcctDetailsForAllChains,
        initAccountForAnyChains,
        samechainTransfer,
        crosschainTransfer,
        justTransfer
    }
}



function createReqLogger(reqKey, tstep, param={}){
    let ret = {reqKey, tstep, param, step: 0, responds: [], success: false, finished: false, lastError: null};

    const ssm = async (k, v) => {
        //save to db and send msg to popup.
        await reqkeysDB.upsertItem(reqKey, ret);
        chrome.runtime.sendMessage({type: C.FMSG_TRANSFER_PROGRESS, key: k, value: v});
        return v;
    }
    
    return {
        set: async (step, respond)=>{
            ret.responds[step-1] = respond;
            ret.step = ret.responds.length;

            if(ret.step === ret.tstep){
                ret.finished = true;
                if(ret.responds[ret.step - 1]?.result?.status === 'success'){
                    ret.success = true;
                    pushNoti(
                        ret.reqKey,
                        ret.param.amount, 
                        ret.param.receiverAccountAddr.slice(0,10).toUpperCase()
                    );
                }
            }
            return await ssm(reqKey, ret); 
        },
        err: async (error)=>{
            ret.lastError = error?.message??error; 
            return await ssm(reqKey, ret); 
        }
    }
}



function ErrorDescription(err){
    let errkey = '';
    switch(err?.constructor.name){
        case 'Error':
        case 'TypeError': {
            errkey = err.message;
            break;
        }
        case 'Object': {
            errkey = JSON.stringify(err);
            break;
        }
        default: {
            errkey = err;
            break;
        }
    }

    const descs = {
        ['Failed to fetch']: 'No Network Connection',

    }

    return descs[errkey] || errkey;
}



