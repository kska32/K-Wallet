import createTransfer from "./transfer";
import {reqkeysDB, senderReqkeyAlarmDB, alarmDbs} from "./localdb";
import C from "./constant";
import {createReqLogger, SendErrorMessage} from "./utils";


export default function(){
    const MAX_COUNT = 60;

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
    }){
        let crlogger = null;
        let senderReqkey = null;

        let param = {...arguments[0]};
        delete param.senderAccountPrivKey;

        gasLimit = Math.min(Math.max(C.MIN_GAS_LIMIT, +gasLimit), C.MAX_GAS_LIMIT);
        gasPrice = Math.min(Math.max(C.MIN_GAS_PRICE, +gasPrice), C.MAX_GAS_PRICE);

        let cct = createTransfer({...arguments[0], gasLimit, gasPrice});

        try{
            let details = await cct.getAcctDetails(receiverAccountAddr, receiverChainId);
            let senderReqkeyResult = await cct.transferSamechain(details.guard);
                   
            senderReqkey = senderReqkeyResult.requestKeys[0];
            crlogger = createReqLogger(senderReqkey, param); 
            await crlogger.set([senderReqkeyResult]);
            await senderReqkeyAlarmDB.upsertItem(senderReqkey, {
                count: 0, maxCount: MAX_COUNT, param, responds: [senderReqkeyResult]
            });
        }catch(err){
            if(crlogger !== null){
                crlogger.err(err);
            }else{
                SendErrorMessage('transfer-create', 2, err, param);
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
    }){
        let crlogger = null;
        let senderReqkey = null;

        let param = {...arguments[0], xGasPrice};
        delete param.senderAccountPrivKey;
        let cct = createTransfer({...arguments[0], xGasPrice});

        try{
            let details = await cct.getAcctDetails(receiverAccountAddr, receiverChainId);
            let senderReqkeyResult = await cct.transferCrosschain(details.guard);
                    
            senderReqkey = senderReqkeyResult.requestKeys[0];
            crlogger = createReqLogger(senderReqkey, param);
            await crlogger.set([senderReqkeyResult]);
            await senderReqkeyAlarmDB.upsertItem(senderReqkey, {
                count: 0, maxCount: MAX_COUNT, param, responds: [senderReqkeyResult]
            });
        }catch(err){
            if(crlogger !== null){
                crlogger.err(err);
            }else{
                SendErrorMessage('transfer-crosschain', 5, err, param);
            }
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
    }){
        try{
            const fn = (senderChainId===receiverChainId ? samechainTransfer : crosschainTransfer);
            return await fn(arguments[0]);
        }catch(err){
            throw err;
        }
    }

    async function continueErrorTransfer(reqkey){
        const d = await reqkeysDB.getItem(reqkey);
        const {param, lastError, key:senderReqkey} = d;

        let {responds, continueCount = 0} = d;
        const crlogger = createReqLogger(senderReqkey, param, responds);

        try{
            console.error("Continue-Transfer - lastError:> ", lastError);
            if(continueCount < 3){
                continueCount++;
            }else{
                responds = responds.slice(0,2);
                continueCount = 0;
            }
            await reqkeysDB.upsertItem(reqkey, {lastError: null, continueCount});
            await crlogger.set(responds);
            await alarmDbs[responds.length - 1].upsertItem(senderReqkey, {count: 0, maxCount: MAX_COUNT, param, responds});
            return true;
        }catch(err){
            SendErrorMessage('continue.no.conn.transfer', 0, err, param);
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

    return {
        getAcctDetailsForAllChains,
        initAccountForAnyChains,
        samechainTransfer,
        crosschainTransfer,
        justTransfer,
        continueErrorTransfer
    }
}






