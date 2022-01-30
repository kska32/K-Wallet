
import Dexie from "dexie";
const db = new Dexie('K: wallet-db');


function createStore(collection){
        db.version(1).stores({[collection]: 'key, timestamp'});

        return {
                'db': ()=>db[collection],
                "setItem": (key,value) => {
                        if(value?.constructor?.name?.toLowerCase() !== 'object'){
                                console.error('Not A plain object.');
                                return false;
                        }
                        return db[collection].put({
                                key,
                                ...value,
                                timestamp: Date.now(),
                        }).then(()=>true);
                },
                "getItem": (key) => {
                        return new Promise((resolve)=>{
                                return db[collection].get(key).then((res)=>{
                                        resolve(res)
                                }).catch((err)=>{
                                        resolve(null);
                                })
                        })

                },
                "upsertItem": (key,value) => {
                        if(value?.constructor?.name?.toLowerCase() !== 'object'){
                                console.error('Not A plain object.');
                                return false;
                        }
                        return db[collection].update(key,{
                                ...value,
                                updateTimestamp: Date.now()
                        }).then((updatedCount)=>{
                                if(updatedCount===0){
                                        return db[collection].put({
                                                        key:key,
                                                        ...value,
                                                        timestamp: Date.now(),
                                                        updateTimestamp: Date.now()
                                                }).then(()=>true);
                                }else{
                                        return true;
                                }
                        });
                },
                "getLastMany": (limit=3, offset=0) => {
                        return db[collection]
                                .orderBy('timestamp')
                                .reverse()
                                .offset(offset)
                                .limit(limit)
                                .toArray();
                },
                "getFollowingMany": (reqkey, limit=1, includeSpecReqkey=false) => {
                        let count = 0;
                        return db[collection].orderBy('timestamp').reverse().filter((item)=>{
                                if(item.key === reqkey){
                                        count++;
                                        return includeSpecReqkey;
                                }
                                if(count> 0 && count <= limit){
                                        count++;
                                        return true;
                                }
                                return false;
                        }).toArray();
                },
                "getAll": ()=> db[collection].orderBy('timestamp').toArray(),
                "count": () => db[collection].count(),
                "deleteByKey": (key) => db[collection].where('key').equals(key).delete()
        }
}

export const keypairsDB = createStore('keypairs');
export const reqkeysDB = createStore("request-keys");
export const accountAddrsDB = createStore("account-addresses");
export const userOptionsDB = createStore("user-options");

export const senderReqkeyAlarmDB = createStore("sender-reqkey-adb");
export const proofAlarmDB = createStore('proof-adb');
export const continueTransferAlarmDB = createStore('ct-transfer-adb');
export const receiverReqkeyAlarmDB = createStore('receiver-reqkey-adb');

export const alarmDbs = [senderReqkeyAlarmDB, proofAlarmDB, continueTransferAlarmDB, receiverReqkeyAlarmDB];
export const alarmDbsStr = ['senderReqkeyAlarmDB', 'proofAlarmDB', 'continueTransferAlarmDB', 'receiverReqkeyAlarmDB'];
