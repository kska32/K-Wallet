import Pact from 'pact-lang-api';
import C from "./constant";
const Promise = window.Promise;
const Set = window.Set;


export default function({   
    senderAccountAddr,
    senderAccountPrivKey,
    receiverAccountAddr,
    amount,
    senderChainId,
    receiverChainId,
    networkId = 'testnet04',
    gasPrice = 0.000001, 
    gasLimit = 600, 
    xGasPrice = 0.00000001,
    xGasLimit = 400,
    ttl = 28800,
    tokenAddress = 'coin'
}){
    const hostAddrCp = ((networkId="") => {
        networkId = networkId.toLowerCase();
        if(networkId.includes('testnet')){
            return (chainId) => `https://api.testnet.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
        }else if(networkId.includes('mainnet')){
            return (chainId) => `https://api.chainweb.com/chainweb/0.0/${networkId}/chain/${chainId}/pact`;
        }else{
            throw "The [networkId] is inccorect";
        }
    })(networkId);
    

    amount = String(amount);
    senderAccountAddr = senderAccountAddr?.toLowerCase()?.trim();
    receiverAccountAddr = receiverAccountAddr?.toLowerCase()?.trim();
    senderAccountPrivKey = senderAccountPrivKey?.toLowerCase();
    senderChainId = String(senderChainId);
    receiverChainId = String(receiverChainId);

    gasPrice = Number(gasPrice);
    gasLimit = Number(gasLimit);
    xGasPrice = Number(xGasPrice);
    xGasLimit = Number(xGasLimit);
    ttl = Number(ttl);

    let gasStationAccount = "free-x-chain-gas";
    const tids = [];

    if(networkId.includes('testnet')){
        xGasPrice = 0.000000001;
    }

    const clearAllIntervals = () => {
        while(tids.length > 0){
            clearInterval(tids.pop());
        }
    }

    const creationTime = () => (Math.round(Date.now() / 1000) - 15);
    const getPubKey = (accAddr="") => (accAddr.toLowerCase().includes("k:") ? accAddr.split(":")[1] : accAddr);
    const formatAmount = (amount) => (Math.floor(amount * 1e8) / 1e8).toFixed(8);

    const listen = async (execToListenCb, breakCondCb, maxDelay=C.LISTEN_MAX_DELAY, eachDelay=C.LISTEN_EACH_DELAY) => {
        let tid = null;
        let ts = Date.now();
    
        return new Promise((resolve)=>{
            const fn = async ()=>{
                const res = await execToListenCb();
                if(breakCondCb(res)){
                    clearInterval(tid);
                    return resolve(res);
                }else{
                    if(Date.now() - ts >= maxDelay){
                        clearInterval(tid);
                        return resolve("TIMEOUT");
                    }
                }
            }
            fn();
            tid = setInterval(fn, eachDelay);
            tids.push(tid);
         });
    }


    const initAccount = async (chainId = 0, keys = [senderAccountAddr], pred = "keys-all")=>{
        const cmds = [
            {
                keyPairs: [],
                pactCode: `(coin.create-account ${JSON.stringify(keys[0])} (read-keyset 'account-keyset))`,
                networkId: networkId,
                envData: {
                    "account-keyset": {
                        "keys": [...new Set(keys.map(ak=>getPubKey(ak)))],
                        "pred": pred
                    }
                },
                meta: Pact.lang.mkMeta(
                    `${gasStationAccount}`,
                    String(chainId),
                    xGasPrice,
                    xGasLimit,
                    creationTime(),
                    ttl,
                )
            }
        ];

        let res = await Pact.fetch.send(cmds, hostAddrCp(chainId));
        if(res.requestKeys === undefined) throw res;
        return res;
    }

    
    const transferCrosschain = async (guard)=>{
            const cmds = [{
                    pactCode: `(${tokenAddress}.transfer-crosschain ${JSON.stringify(senderAccountAddr)} ${JSON.stringify(receiverAccountAddr)} (read-keyset "own-ks") ${JSON.stringify(receiverChainId)} ${formatAmount(amount)})`,
                    networkId: networkId,
                    keyPairs: [{
                        publicKey: getPubKey(senderAccountAddr),
                        secretKey: senderAccountPrivKey,
                        clist: []
                    }],
                    meta: Pact.lang.mkMeta(senderAccountAddr, String(senderChainId), gasPrice, gasLimit, creationTime(), ttl),
                    envData: {
                        "own-ks": guard || {
                            "pred": "keys-all",
                            "keys": [ getPubKey(receiverAccountAddr) ]
                        }
                    }
            }];
    
            let res = await Pact.fetch.send(cmds, hostAddrCp(senderChainId));
            if(res.requestKeys === undefined) throw res;
            return res;
    }


    const transferSamechain = async (guard) => {
        const cmds = [
            {
                pactCode: `(${tokenAddress}.transfer-create ${JSON.stringify(senderAccountAddr)} ${JSON.stringify(receiverAccountAddr)} (read-keyset "recp-ks") ${formatAmount(amount)})`,
                networkId: networkId,
                keyPairs: [{
                    publicKey: getPubKey(senderAccountAddr),
                    secretKey: senderAccountPrivKey,
                    clist: [
                        {
                            name: `${tokenAddress}.TRANSFER`,
                            args: [senderAccountAddr, receiverAccountAddr, Number(formatAmount(amount))]
                        },
                        {
                            name: `coin.GAS`,
                            args: []
                        }
                    ]
                }],
                meta: Pact.lang.mkMeta(senderAccountAddr, String(senderChainId), gasPrice, gasLimit, creationTime(), ttl),
                envData: {
                    "recp-ks": guard || {
                        "pred": "keys-all",
                        "keys": [ getPubKey(receiverAccountAddr) ]
                    }
                }
            }
        ];
        
        let res = await Pact.fetch.send(cmds, hostAddrCp(senderChainId));
        if(res.requestKeys === undefined) throw res;

        return res;
    }

    const listenReqkey = async (reqKey, chainId) => {
            const listenResult = await listen(
                ()=>(Pact.fetch.poll({requestKeys: [reqKey]}, hostAddrCp(chainId))), 
                (r)=>(Object.keys(r).length !== 0),
                C.LISTEN_MAX_DELAY,
                C.LISTEN_EACH_DELAY
            ); 

            const respond = listenResult[reqKey];
            if(respond?.result?.status === 'failure'){
                throw respond.result.error.message;
            }else if(listenResult === "TIMEOUT"){
                throw listenResult;
            }else{
                return respond;
            }
    }

    const createSpvCmd = (reqkeyResult) => {
        if (reqkeyResult?.result?.status === 'success') {
            const pactId = reqkeyResult.continuation.pactId;
            const targetChainId = reqkeyResult.continuation.yield.provenance.targetChainId;
            const sourceChainId = reqkeyResult.continuation.yield.source;

            const spvCmd = {
                "sourceChainId": sourceChainId,
                "targetChainId": targetChainId, 
                "requestKey": pactId 
            };
            return spvCmd;
        }else{
            return reqkeyResult?.result??reqkeyResult;
        }
    }

    const getProof = async (spvCmd) => {
            let proof = await listen(
                ()=>(Pact.fetch.spv(spvCmd, hostAddrCp(spvCmd.sourceChainId))),
                (r)=>(r != 'SPV target not reachable: target chain not reachable. Chainweb instance is too young'),
                C.LISTEN_MAX_DELAY,
                C.LISTEN_EACH_DELAY
            );
            return proof;
    }

    const continueTransfer = async (
        reqKey, 
        proof, 
        step = 1,
        targetChainId
    ) => {
            const meta = Pact.lang.mkMeta(
                `${gasStationAccount}`, 
                String(targetChainId), 
                xGasPrice, 
                xGasLimit, 
                creationTime(), 
                ttl
            );
            
            let res = await Pact.fetch.send({
                type: "cont",
                meta,
                proof, 
                pactId: reqKey, 
                rollback: false, 
                keyPairs: [],
                step,
                networkId
            }, hostAddrCp(targetChainId));

            if(res.requestKeys === undefined) throw res;
            return res;
    }

    const getAcctDetails = async (accountAddr, chainId) => {
            accountAddr = accountAddr?.toLowerCase();
            let data = await Pact.fetch.local({
                pactCode: `(${tokenAddress}.details ${JSON.stringify(accountAddr)})`,
                meta: Pact.lang.mkMeta("", String(chainId), gasPrice, gasLimit, ttl, creationTime()),
            }, hostAddrCp(chainId));
                    
            if (data?.result?.status === "success"){
                return {...data.result.data, chainId}
            } else {
                return { account: null, guard: null, balance: 0, chainId: chainId }
            }
    }

    const getFullAcctDetails = async (
        accountAddr
    ) => {
        return Promise.all((new Array(20)).fill(0).map((v,i)=>{
                return getAcctDetails(accountAddr, i)
        }));
    }

    const searchReqKey = async (reqKey) => {
        return Promise.any(new Array(20).fill(0).map((v,i)=>{
            return new Promise((resolve, reject)=>{
                return listenReqkey(reqKey, i, hostAddrCp).then((r)=>{
                    if(r?.result?.status === 'success'){
                        clearAllIntervals();
                        return resolve(r);
                    }else if(r?.result?.status === 'failure'){
                        clearAllIntervals();
                        return reject(r);
                    }else{
                        return reject(r);
                    }
                })
            })
        }));
    }

    return {
        initAccount,
        transferCrosschain,
        transferSamechain,
        listenReqkey,
        createSpvCmd,
        getProof,
        continueTransfer,
        listen,
        getAcctDetails,
        searchReqKey,
        getFullAcctDetails
    }

}


