import Pact from 'pact-lang-api';
import {delay} from "./utils";


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

    const creationTime = () => (Math.round(Date.now() / 1000) - 15);
    const getPubKey = (accAddr="") => (accAddr.toLowerCase().includes("k:") ? accAddr.split(":")[1] : accAddr);
    const formatAmount = (amount) => (Math.floor(amount * 1e8) / 1e8).toFixed(8);

    const initAccount = async (chainId = 0, keys = [senderAccountAddr], pred = "keys-all")=>{
        const cmds = [
            {
                keyPairs: [],
                pactCode: `(${tokenAddress}.create-account ${JSON.stringify(keys[0])} (read-keyset 'account-keyset))`,
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
                            name: `${tokenAddress}.GAS`,
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


    const selectReqkey = async (reqKey, chainId, step) => {
        let selectResult = await Pact.fetch.poll({requestKeys: [reqKey]}, hostAddrCp(chainId));
        if(Object.keys(selectResult).length !== 0){
            const reqkeyResult = selectResult[reqKey];
            if(reqkeyResult?.result?.status === 'failure'){
                throw reqkeyResult.result.error.message;
            }else{
                const rt = selectResult[reqKey];
                return rt !== undefined ? rt : null;
            }
        }else{
            return null;
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

    const fetchProof = async (spvCmd) => {
        let proof = await Pact.fetch.spv(spvCmd, hostAddrCp(spvCmd.sourceChainId));
        if(proof !== 'SPV target not reachable: target chain not reachable. Chainweb instance is too young'){
            try{
                const jsonstr = atob(proof);
                const obj = JSON.parse(jsonstr);
                return obj.algorithm ? proof : null;
            }catch(err){
                return null;
            }
        }else{
            return null;
        }
    }

    const continueTransfer = async (
        reqKey, 
        proof, 
        step = 1,
        targetChainId
    ) => {
            const meta = Pact.lang.mkMeta(
                networkId.includes('testnet') ? senderAccountAddr : gasStationAccount, 
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
                keyPairs: [{
                    publicKey: getPubKey(senderAccountAddr),
                    secretKey: senderAccountPrivKey
                }],
                step,
                networkId
            }, hostAddrCp(targetChainId));

            if(res.requestKeys === undefined) throw res;
            return res;
    }

    const getAcctDetails = async (accountAddr, chainId) => {
            accountAddr = accountAddr?.toLowerCase();
            let data = await Promise.race([
                Pact.fetch.local({
                    pactCode: `(${tokenAddress}.details ${JSON.stringify(accountAddr)})`,
                    meta: Pact.lang.mkMeta("", String(chainId), gasPrice, gasLimit, ttl, creationTime()),
                }, hostAddrCp(chainId)), 
                delay(3000, {result: {status: 'timeout'}})
            ]);
            switch(data?.result?.status){
                case 'success':
                    return { ...data.result.data, chainId };
                case 'timeout':
                    return { account: null, guard: null, balance: -1, chainId };
                default:
                    return { account: null, guard: null, balance: 0, chainId };
            }
    }

    const getFullAcctDetails = async (
        accountAddr
    ) => {
        return Promise.all((new Array(20)).fill(0).map((v,i)=>{
                return getAcctDetails(accountAddr, i)
        })).catch((err)=>{
            throw err;
        })
    }

    const postV1SignResponse = async function(keyPairs, nonce, pactCode, envData, meta, networkId){
        let p = arguments.slice();
        return await Pact.api.prepareExecCmd(...p);

    }


    return {
        initAccount,
        transferCrosschain,
        transferSamechain,
        selectReqkey,
        createSpvCmd,
        fetchProof,
        continueTransfer,
        getAcctDetails,
        getFullAcctDetails,
        postV1SignResponse
    }

}


