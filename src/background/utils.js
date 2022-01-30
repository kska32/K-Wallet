/* eslint-disable no-undef */
import CryptoJS from "crypto-js";
import nacl from "tweetnacl";
import {Buffer} from "buffer";
import { v4 as generateUUID } from 'uuid';
import { reqkeysDB } from "./localdb";
import C from "./constant";
import {pushNoti} from "./notification";


const toBin = hexstr => new Uint8Array(Buffer.from(hexstr,'hex'));
const toHex = b => Buffer.from(b).toString('hex');
export const sha512 = (message) => CryptoJS.SHA512(message).toString(CryptoJS.enc.Base64);

export const aesEncrypt = (plaintext, key) => {
    let ciphertext = CryptoJS.AES
                    .encrypt(plaintext, key)
                    .toString();
    let hmac = CryptoJS.HmacSHA256(ciphertext, CryptoJS.SHA256(key)).toString();
    let hmacCiphertext = hmac + ciphertext;
    return hmacCiphertext;
}

export const aesDecrypt = (hmacCiphertext, key) => {
    const hmac = hmacCiphertext.slice(0, 64);
    const ciphertext = hmacCiphertext.slice(64);
    const confirmhmac = CryptoJS.HmacSHA256(ciphertext, CryptoJS.SHA256(key)).toString();

    let plaintext;
    if(hmac===confirmhmac){
            plaintext = CryptoJS.AES
                    .decrypt(ciphertext, key)
                    .toString(CryptoJS.enc.Utf8);
    }else{
            plaintext = "%%ERROR_DECRYPT_FAILED%%";
    }
    return plaintext;
}

export const generateRandomKeypair = () => {
    let kps = nacl.sign.keyPair();
    return {
        publicKey: toHex(kps.publicKey),
        secretKey: toHex(kps.secretKey).slice(0,64)
    }
}

export const getPublicKeyFromSecretKey = (secretKey) => {
    let bin = toBin(secretKey);
    let kp = nacl.sign.keyPair.fromSeed(bin);
    return toHex(kp.publicKey);
}

export const boxEncrypt = (text, password) => {
    let msg = new Uint8Array(Buffer.from(text, 'utf8'));
    let key = nacl.hash(new Uint8Array(Buffer.from(password))).slice(16,48);
    let nonce = nacl.randomBytes(nacl.box.nonceLength);
    let box = nacl.secretbox(msg, nonce, key);
    let encMsg = Buffer.from(nonce).toString('hex') + Buffer.from(box).toString('hex');
    return encMsg;
}

export const boxDecrypt = (encMsg, password) => {
    let key = nacl.hash(new Uint8Array(Buffer.from(password))).slice(16,48);
    let nb = new Uint8Array(Buffer.from(encMsg,'hex'));
    let nonce = nb.slice(0,24);
    let box = nb.slice(24);
    let textBuffer = nacl.secretbox.open(box, nonce, key);
    let text = Buffer.from(textBuffer).toString();
    return text;
}

export function createTabCompletely(createOptions,callback){
    chrome.tabs.create(createOptions,(tab)=>{
        let tidx = setInterval(()=>{
            chrome.tabs.get(tab.id,(tabx)=>{
                if(tabx.status==='complete'){
                    clearInterval(tidx);
                    if(callback){
                        callback(tab);
                    }
                }
            });
        });
    });
}

export function findTabAndHighlightByUrl(url,callback){
    chrome.tabs.query({},(tabs)=>{
        let finded = false;
        let tabix = null;
        let tabid = null;

        for(let i=0; i<tabs.length; i++){
                if(tabs[i].url.indexOf(url)>-1){
                        finded = true;
                        tabix = tabs[i].index;
                        tabid = tabs[i].id;
                        break;
                }
        }
        if(finded){
            chrome.tabs.highlight({tabs:tabix},(window)=>{
                if(chrome.runtime.lastError){}
                if(callback){
                    callback(true,tabid);
                }
            });
        }else{
            if(callback){
                callback(false,null);
            }
        }
    });
}

export function sendMsgToTabs(queryInfo,message,callback){
    chrome.tabs.query(queryInfo,(tabs)=>{
        tabs.forEach((tab)=>{
            chrome.tabs.sendMessage(tab.id, message, (res)=>{
                if(chrome.runtime.lastError){}
                if(callback) callback(res,tab);
            });
        });
    });
}

export function normalizeUTF8(str){
    try{
        return decodeURIComponent(escape(str));
    }catch(err){
        return str;
    }
}

export function runtimeSendMessage(message){
    return new Promise((resolve,reject)=>{
        chrome.runtime.sendMessage(message, (res)=>{
            if(!chrome.runtime.lastError){
                resolve(res)
            }else{
                reject(res.runtime.lastError);
            }
        });
    });
}

export function delay(t=1000){
    return new Promise((resolve)=>{
        setTimeout(()=>resolve(),t);
    })
}

export function isValidKey(value){
    const vc = value.toLowerCase();
    if(vc.length !== 64) return false;
    return [...vc].every((v,i)=>"0123456789abcdef".includes(v));
}



export const StateManager = (()=>{
    return {
        get: (k) => chrome.storage.local.get(k),
        set: (v) => chrome.storage.local.set(v),
        clear: () => chrome.storage.local.clear()
    }
})();

export async function createAlarm(alarmName, when = 0, interval = 3, handler = () => {}){
    for(let i=1; i <= 60/interval; i++){
        chrome.alarms.create(`${alarmName}+${i}`, {
            when: Date.now() + 1000 * when + 1000 * interval * i,
            periodInMinutes: 1
        });
    }

    const listener = ({name}) => {
        if(name.includes(alarmName)){
            handler(name, alarmName);
        }
    };

    chrome.alarms.onAlarm.addListener(listener);
}


export function createReqLogger(reqKey, param={}, responds = [], success = false, finished = false, lastError = null){
    let ret = {reqKey, param, responds, success, finished, lastError, step: responds.length, tstep: 0};
    const isxtransfer = param.senderChainId !== param.receiverChainId;
    ret.tstep = isxtransfer ? 5 : 2;

    const ssm = async (k, v) => {
        //save to db and send msg to popup.
        await reqkeysDB.upsertItem(reqKey, ret);
        chrome.runtime.sendMessage({type: C.FMSG_TRANSFER_PROGRESS, key: k, value: v});
        return v;
    }
    
    return {
        set: async (responds)=>{
            ret.responds = responds;
            ret.step = ret.responds.length;

            if(ret.step === ret.tstep){
                ret.finished = true;
                if(ret.responds[ret.step - 1]?.result?.status === 'success'){
                    ret.success = true;
                    pushNoti(
                        ret.reqKey,
                        ret.param
                    );
                }
            }

            if(ret.step <= 1){
                await StateManager.set({
                    isLoading: {opened: false, text: null},
                    transferConfirmOpened: false, pageNum: 11,
                })
            }
            return await ssm(reqKey, ret); 
        },
        err: async (error)=>{
            await StateManager.set({
                isLoading: {opened: false, text: null}
            });
            ret.lastError = error?.message??error; 
            return await ssm(reqKey, ret); 
        }
    }
}

export function SendErrorMessage(behavior, totalstep, err, param = {}){
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
