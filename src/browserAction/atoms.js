import {atom,selector} from 'recoil';
import C from "../background/constant";
import {ss} from "../background/utils";

const promiseSendMessage = (msg) => {
    return new window.Promise((resolve,reject)=>{
        chrome.runtime.sendMessage(msg, (state)=>{
            if(chrome.runtime.lastError){
                //console.warn(chrome.runtime.lastError.message);
                reject(chrome.runtime.lastError.message)
            } 
            resolve(state);
        });
    })
}

export const vState = atom({
    key: 'vState',
    default: promiseSendMessage({type: C.MSG_GET_STATE})
}); 


export const vHasAccount = atom({
    key: 'vHasAccount',
    default: promiseSendMessage({type: C.MSG_HAS_ACCOUNT})
});


export const vKDAprice = atom({
    key: 'vKDAprice',
    default: promiseSendMessage({type: C.MSG_GET_KDA_PRICE})
});

export const vRecentReqkeysData = atom({
    key: 'vRecentReqkeysData',
    default: promiseSendMessage({type: C.MSG_GET_RECENT_REQKEYS_DATA}),
});

//========================== Selector ==============================


export const vStateX = selector({
    key: 'vStateX',
    get: ({get}) => get(vState),
    set: ({get, set}, newValue)=>{
        chrome.runtime.sendMessage({ type: C.MSG_SET_STATE, value: newValue });
        set(vState, {...get(vState), ...newValue}); 
    }
});

const AtomHelper = (keyName, Atom=vStateX)=>({
    key: keyName,
    get: ({get}) => get(Atom)?.[keyName],
    set: ({get,set}, newValue) => {
        set(Atom, {...get(Atom), [keyName]: newValue});
    }
})


export const vLockupX = selector({
    key: 'vLockupX',
    get: ({get}) => !!get(vState)?.password,
    set: ({get,set}, newValue) => {
        if(newValue===true){
            chrome.runtime.sendMessage({ type: C.MSG_LOCK_UP });
            set(vState, {
                ...get(vState), 
                password: '', 
                keypairHex: {publicKey:'',secretKey:''},
                keypairBuf: {publicKey:'',secretKey:''},
                pageNum: 5
            });
        }
    }
});


export const vAccAddrX = selector({
    key: 'vAccAddrX',
    get: ({get}) => {
        let accAddr = get(vState)?.keypairHex?.publicKey; 
        return !!accAddr ? 'k:'+accAddr : '';
    }
});

export const vRecentReqkeysDataX = selector({
    key: 'vRecentReqkeysDataX',
    get: ({get}) => get(vRecentReqkeysData),
    set: ({get,set}, newValue) => {
        set(vRecentReqkeysData, [...newValue]);
    }
});

export const vNetworkIdX = selector({
    key: "vNetworkIdX",
    get: ({get}) => get(vStateX)?.networkId,
    set: ({get,set}, newValue) => {
        chrome.runtime.sendMessage({type: C.MSG_SET_NETWORKID, networkId: newValue});
        set(vStateX, {...get(vStateX), networkId: newValue});
    }
});

export const vPasswordX = selector(AtomHelper('password',vState));

export const vPasswordConfirmX = selector(AtomHelper('passwordConfirm'), vState);

export const vPasswordRX = selector(AtomHelper('passwordR', vState));

export const vKeypairHexX = selector(AtomHelper('keypairHex',vState));

export const vPageNumX = selector(AtomHelper('pageNum'));

export const vAccountDetailsX = selector(AtomHelper('accountDetails'));

export const vIsLoadingX = selector(AtomHelper('isLoading', vStateX));

export const vTransferOptX = selector(AtomHelper('transferOpt'));

export const vConfirmOpenedX = selector(AtomHelper('confirmOpened'));

export const vErrorDataX = selector(AtomHelper('errorData'));

export const vInfoDataX = selector(AtomHelper('infoData'));

export const vGlobalErrorDataX = selector(AtomHelper('globalErrorData'));

export const vSidebarOpenedX = selector(AtomHelper('sidebarOpened'));

export const vKeypairListX = selector(AtomHelper('keypairList'));

export const vConfirmDataX = selector(AtomHelper('confirmData'));

export const vSwitchAccountBoxOpenedX = selector(AtomHelper('switchAccountBoxOpened'));

export const vSenderAddrListX = selector(AtomHelper('senderAddrList'));

export const vReceiverAddrListX = selector(AtomHelper('receiverAddrList'));

export const vPrivateKeyPageX = selector(AtomHelper('privateKeyPage'));

export const vDeleteDataX = selector(AtomHelper('deleteData'));

export const vImportPrikeyPageX = selector(AtomHelper('importPriKeyPage'));

export const vChangePasswordPageX = selector(AtomHelper('changePasswordPage'));