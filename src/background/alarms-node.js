import {createAlarm, createReqLogger, StateManager} from "./utils";
import {senderReqkeyAlarmDB, receiverReqkeyAlarmDB, proofAlarmDB, continueTransferAlarmDB, userOptionsDB} from './localdb';
import createTransfer from "./transfer";
import * as ccxt from "ccxt";
import C,{BackgroundState} from "./constant";
const deepCopy = o => JSON.parse(JSON.stringify(o));

async function createAlarmNode(infs){
    infs.forEach((inf,ix)=>{
        const {name, when, interval, handler} = inf;
        createAlarm(name, when, interval, async(name, alarmName)=>{
            const dbs = {senderReqkeyAlarmDB, proofAlarmDB, receiverReqkeyAlarmDB, continueTransferAlarmDB};
            const db = dbs[alarmName + 'DB'];
            handler(db, alarmName, name);
        });
    });
}

export async function KdaPriceTick(){
    createAlarm('kdapriceTick', 0, 5, async(name, alarmName)=>{
        try{
            let kucoin = new ccxt.kucoin();
            let res = await kucoin.fetchTicker('KDA/USDT');
            await StateManager.set({kdausdt: res?.last??0});
        }catch(err){
            console.error(err);
        }
    })
}

export async function AutoLocker(){

    createAlarm('AutoLocker', 0, 5, async(name, alarmName)=>{
        try{
            const name = 'lockupTime';
            const LIMITTIME = 1000 * 60 * 8;
            let lockupTime = await userOptionsDB.getItem(name);
            if(lockupTime === undefined){
                await userOptionsDB.upsertItem(name, {endTime: Date.now() + LIMITTIME, limitTime: LIMITTIME});
            }else{
                let {endTime, limitTime} = lockupTime;
                let percent = Math.max( +((endTime - Date.now()) / limitTime * 100).toFixed(2), 0 );

                if(percent===0){
                    const state = await StateManager.get();
                    await StateManager.set({
                        ...deepCopy(BackgroundState), 
                        pageNum: 5, 
                        networkId: state.networkId
                    });
                }else{
                    chrome.runtime.sendMessage({
                        type: C.FMSG_LOCK_PROGRESS_STATE, 
                        value: percent
                    });
                }
            }
        }catch(err){

        }
    });

    chrome.runtime.onMessage.addListener((o)=>{
        userOptionsDB.getItem('lockupTime').then((res)=>{
            const limitTime = res?.limitTime??0;
            if(limitTime){
                userOptionsDB.upsertItem('lockupTime', {
                    endTime: Date.now() + limitTime
                });
            }
        });
        return true;
    });
}





export default async function initNode(){
    createAlarmNode([
        {
            name: 'senderReqkeyAlarm',
            interval: 5,
            when: 0,
            handler: async (db, alarmName)=>{
                let list = await db.getAll();

                list.forEach( async(v,i)=>{
                    const {key, param, count, maxCount, responds} = v;
                    const senderReqkey = key;
                    const senderChainId = v.param.senderChainId;
                    const isxtransfer = v.param.senderChainId !== v.param.receiverChainId;
                    const crlogger = createReqLogger(senderReqkey, param, responds);

                    try{
                        const cct = createTransfer(param);
                        const senderListenResult = await cct.selectReqkey(senderReqkey, senderChainId);

                        if(count > maxCount) throw "TIMEOUT";
                        if(senderListenResult === null){
                            await db.upsertItem(senderReqkey, {count: count+1});
                        }else{
                            const newResponds = [...responds, senderListenResult];
                            await crlogger.set(newResponds);
                            if(isxtransfer){
                                await proofAlarmDB.upsertItem(senderReqkey, {
                                    count: 0, maxCount, param, responds: newResponds
                                });
                            }
                            await db.deleteByKey(senderReqkey);
                        }
                    }catch(err){
                        await crlogger.err(err);
                        await db.deleteByKey(senderReqkey);
                    }
                })
                
            }
        },
        {
            name: 'proofAlarm',
            interval: 5,
            when: 1,
            handler: async(db, alarmName)=>{
                let list = await db.getAll();

                list.forEach( async(v,i)=>{
                    const {key, param, count, maxCount, responds} = v;
                    const senderReqkey = key;
                    const crlogger = createReqLogger(senderReqkey, param, responds);

                    try{
                        if(count > maxCount) throw "TIMEOUT";
                        const cct = createTransfer(param);
                        const spvCmd = cct.createSpvCmd(responds[responds.length-1]);
                        const proof = await cct.fetchProof(spvCmd);

                        if(proof === null){
                            await db.upsertItem(senderReqkey, {count: count+1});
                        }else{
                            const newResponds = [...responds, proof];
                            await crlogger.set(newResponds);
                            await continueTransferAlarmDB.upsertItem(senderReqkey, {
                                count: 0, maxCount, param, responds: newResponds
                            });
                            await db.deleteByKey(senderReqkey);
                        }
                    }catch(err){
                        await crlogger.err(err);
                        await db.deleteByKey(senderReqkey);
                    }
                });
                
            }
        },
        {
            name: 'continueTransferAlarm',
            interval: 5,
            when: 2,
            handler: async(db, alarmName)=>{
                let list = await db.getAll();

                list.forEach( async(v,i)=>{
                    const {key, param, count, maxCount, responds} = v;
                    const senderReqkey = key;
                    const proof = responds[responds.length-1];
                    const receiverChainId = param.receiverChainId;
                    const crlogger = createReqLogger(senderReqkey, param, responds);

                    try{
                        if(count > maxCount) throw "TIMEOUT";
                        const cct = createTransfer(param);
                        let receiverReqkeyResult = await cct.continueTransfer(senderReqkey, proof, 1, receiverChainId);
                        const newResponds = [...responds, receiverReqkeyResult];
                        await crlogger.set(newResponds);
                        await receiverReqkeyAlarmDB.upsertItem(senderReqkey, {
                            count: 0, maxCount, param, responds: newResponds
                        });
                        await db.deleteByKey(senderReqkey);

                    }catch(err){
                        await crlogger.err(err);
                        await db.deleteByKey(senderReqkey);
                    }
                });
                
            }
        },
        {
            name: 'receiverReqkeyAlarm',
            interval: 5,
            when: 3,
            handler: async(db, alarmName)=>{
                let list = await db.getAll();

                list.forEach( async(v,i)=>{
                    const {key, param, count, maxCount, responds} = v;
                    const senderReqkey = key;
                    const receiverReqkey = responds[responds.length-1].requestKeys[0];
                    const receiverChainId = param.receiverChainId;
                    const crlogger = createReqLogger(senderReqkey, param, responds);

                    try{
                        const cct = createTransfer(param);
                        const receiverListenResult = await cct.selectReqkey(receiverReqkey, receiverChainId);

                        if(count > maxCount) throw "TIMEOUT";
                        if(receiverListenResult === null){
                            await db.upsertItem(senderReqkey, {count: count+1});
                        }else{
                            const newResponds = [...responds, receiverListenResult];
                            await crlogger.set(newResponds);
                            await db.deleteByKey(senderReqkey);
                        }
                    }catch(err){
                        await crlogger.err(err);
                        await db.deleteByKey(senderReqkey);
                    }
                })
            }
        }
    ]);
}








