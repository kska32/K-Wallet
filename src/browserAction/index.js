import React,{Suspense, useState, useCallback, useLayoutEffect} from "react";
import {RecoilRoot, useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {
    vPageNumX, vPasswordX, vHasAccount, vIsLoadingX,  
    vGlobalErrorDataX, vConfirmDataX, vDeleteDataX, 
    vReceiverAddrListX, vState
} from "./atoms.js";
import Button from '@material-ui/core/Button';
import C from "../background/constant";
import produce from "immer";

import ReactDOM from 'react-dom';
import styled from "styled-components";
import 'semantic-ui-css/semantic.min.css';
import "./index.scss";

import CreateWalletInit from "./components/create-wallet-init.js";
import CreateWalletUnlock from "./components/wallet-lock-page.js";
import CreateWalletStepper from "./components/create-wallet-stepper.js";
import WalletDashboard from "./components/wallet-dashboard.js";
import ImportWalletStepper from "./components/import-wallet-stepper.js";
import circlesSvg from "./images/circles.svg";
import ErrorOutlineOutlinedIcon from '@material-ui/icons/ErrorOutlineOutlined';
import CloseOutlinedIcon from '@material-ui/icons/CloseOutlined';


const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    box-sizing: border-box;
`;

const LoadingBox = styled.span`
    position: fixed !important;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;
    z-index: 10000;

    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(255,255,255, 0);
    transition: all 0.24s;
    pointer-events: none;
    flex-flow: column nowrap;

    &:before{
        content: '';
        position: relative;
        width: 128px;
        height: 128px;
        background: rgba(0,0,0,0) url(${circlesSvg}) no-repeat center;
        background-size: 80%;
        border-radius: 50%;
        filter: drop-shadow(3px 3px 3px rgba(0, 0, 0, .7));
        opacity: 0;
        transition: all 0.24s;
        transform: scale(0.8);
    }

    &:after{
        content: '${p=>p.loadingText || "Loading . . ."}';
        font-size: 22px;
        font-weight: bold;
        opacity: 0;
        margin-top: 30px;
        color: rgba(0, 0, 0, 0.4);
        filter: drop-shadow(3px 3px 3px rgba(0, 0, 0, .7));
        font-style: oblique;
        color: white;
    }

    ${
        (p)=>{
            if(p.isLoading===true){
                return `
                    background-color: rgba(255,255,255, 0.33);
                    pointer-events: initial;

                    &:after,
                    &:before{
                        opacity: 1;
                        transform: scale(1);
                    }
                `;
            }
        }
    }
`;

const ModalStyle = styled.div`
    position: fixed;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 100%;
    z-index: 380;
    background-color: rgba(0,0,0,0.66);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: 10px;
    opacity: 0;
    pointer-events: none;
    transition: all 0.18s;
    ${
        p=>p.visible==true && `
            opacity: 1;
            pointer-events: initial;
        `
    }
    >div{
        position: relative;
        box-shadow: 6px 8px 5px 3px rgba(0,0,0,0.3);
        &:nth-of-type(1){
            width: 320px;
            height: 150px;
            background-color: #eee;

            display: flex;
            flex-flow: column nowrap;
            justify-content: center;
            align-items: center;
            overflow: hidden;

            >div{
                position: relative;
                width: 100%;
                display: flex;
               
                flex-flow: column nowrap;
                justify-content: center;
                align-item: center;

                &:nth-of-type(1){
                    background-color: #d45659;
                    flex: 1;
                    padding: 0px 15px;
                    font-size: 16px;
                    border-bottom: thin inset rgba(255,255,255,0.3);
                    user-select: none;

                    &.confirmType{
                        background-color: #2a6f97;
                    }

                    &.deleteType{
                        background-color: #333;
                    }
                }
                &:nth-of-type(2){
                    background-color: #d45659;
                    flex: 2;
                    border-bottom: thin inset rgba(255,255,255,0.3);
                    padding: 15px 15px;
                  
                    display: flex;
                    flex-direction: row;
                    overflow: auto;
                    line-height: 1rem;
                    justify-content: center;
                    align-items: flex-start;
                    scroll-padding: 15px;
                    word-break: break-all;

                    &.confirmType{
                        padding: 15px 70px;
                        text-align: center;
                        word-break: unset;
                        user-select: none;
                        background-color: #2a6f97;
                    }
                    &.deleteType{
                        padding: 15px 70px;
                        text-align: center;
                        word-break: unset;
                        user-select: none;
                        background-color: #333;
                        flex-flow: column nowrap;
                        align-items: center;
                        font-size: 11px;

                        >div.privatekey{
                            position: relative;
                            display: flex;
                            flex-flow: column nowrap;
                            
                            &:before{
                                content: '';
                                background-color: white;
                                width: 100%;
                                position: absolute;
                                display: flex;
                                height: 100%;
                                left: 0px;
                                top: 0px;
                                transition: all 0.24s;
                                transform: scaleX(0);
                                background-color: rgba(255,255,255,0.3);
                                pointer-events: none;
                            }

                            &:focus-within{
                                &:before{
                                    content: '';
                                    transform: scaleX(1);
                                }
                            }

                            &:after{
                                content: 'invalid private key.';
                                position: absolute;
                                font-size: 10px;
                                left: 50%;
                                color: rgba(255,255,255,0.8);
                                transform: translate(-50%,-50%) scale(0.5);
                                top: 100%;
                                white-space: nowrap;
                                margin-top: 10px;
                                transition: all 0.24s;
                                opacity: 0;
                                user-select: none;
                                pointer-events: none;
                            }

                            &.invalid-privatekey{
                                &:after{
                                    transform: translate(-50%,-50%) scale(1);
                                    opacity: 1;
                                }
                            }
                            
                            >input{
                                outline: none;
                                border: none;
                                border-bottom: thin solid white;
                                color: white;
                                font-size: 12px;
                                background-color: transparent;
                                text-align: center;
                                padding: 3px;

                                &::placeholder{
                                    color: rgba(255,255,255,0.5);
                                    font-size: 10px;
                                    text-align: center;
                                    color: #FFC900;
                                }
                            }
                        }

                    }
                    &::-webkit-scrollbar {
                        width: 3px;
                    }
                }
                &:nth-of-type(3){
                    flex: 1.2;
                    padding: 0px 15px;
                    display: flex;
                    flex-flow: row nowrap;
                    align-items: center;
                    justify-content: flex-end;
                    >button{
                        height: 22px;
                        width: 80px;
                        font-size: 10px;
                        margin-left: 8px;
                    }
                }
            }

            >svg.close-icon{
                position: absolute;
                right: 12px;
                top: 8px;
                color: rgba(255,255,255,0.86);
                cursor: pointer;
                display: flex;
                justify-content: center;
                align-items: center;
                border-radius: 50%;
                user-select: none;
                font-size: 16px;

                &:hover{
                    color: rgba(255,255,255,1);
                }
            }
            >svg.bg-icon{
                position: absolute;
                left: 50%;
                top: 50%;
                font-size: 136px;
                pointer-events: none;
                color: rgba(255,255,0,0.2);
                transform: translate(-50%,-50%);

                &.deleteType{
                    color: rgba(255,255,255,0.1);
                }
            }
        }
    }
`;

const AlertModal = ()=>{
    const [gErrData,setGErrData] = useRecoilState(vGlobalErrorDataX);

    const close = useCallback(()=>{
        setGErrData(produce((s)=>{
            s.opened = false;
        }))
    },[])

    return <ModalStyle visible={gErrData.opened}>
        <div>
            <div>
                <span>Error</span>
            </div>
            <div>
               { gErrData.message }
            </div>
            <div>
                <Button variant="contained" color="secondary" size='small' onClick={close}>ok</Button>
            </div>
            <CloseOutlinedIcon className='close-icon' onClick={close}/>
            <ErrorOutlineOutlinedIcon className='bg-icon'/>
        </div>
    </ModalStyle>
}


const ConfirmModal = ()=>{
    const [confirmData, setConfirmData] = useRecoilState(vConfirmDataX);
    const setLoading = useSetRecoilState(vIsLoadingX);

    const close = useCallback(()=>{
        setConfirmData(produce((s)=>{
            s.opened = false;
        }));
    }, []);

    const confirm = useCallback(()=>{
        setConfirmData(produce((s)=>{
            s.opened = false;
            s.message = null;
            s.confirmed = true;
        }));            
    }, []);

    return <ModalStyle visible={confirmData.opened}>
        <div>
            <div className='confirmType'>
                <span>Confirm</span>
            </div>
            <div className='confirmType'>
                {confirmData.message}
            </div>
            <div>
                <Button variant="contained" color="secondary" size='small' onClick={close}>cancel</Button>
                <Button variant="contained" color="primary" size='small' onClick={confirm}>confirm</Button>
            </div>
            <CloseOutlinedIcon className='close-icon' onClick={close}/>
            <ErrorOutlineOutlinedIcon className='bg-icon'/>
        </div>
    </ModalStyle>
}


const DeleteModal = (props) => {
    const [deleteData, setDeleteData] = useRecoilState(vDeleteDataX);
    const [key, setKey] = useState('');
    const [invalidKey, setInvalidKey] = useState(null);
    const [tid, setTid] = useState(0);
    const [isLoading, setLoading] = useRecoilState(vIsLoadingX);

    const close = useCallback(()=>{
        setDeleteData(produce((s)=>{
            s.opened = false;
        }));                    
        setKey('');
        setInvalidKey(null);
    }, []);

    const confirm = useCallback(()=>{
        if(key.length >= 64){
            setLoading(produce((s)=>{
                s.opened = true;
                s.text = null;
            }));
            chrome.runtime.sendMessage({
                type: C.MSG_VERIFY_PRIVATE_KEY,
                publicKey: deleteData.publicKey,
                privateKey: key
            }, ({success, error})=>{
                if(success === true){
                    chrome.runtime.sendMessage({
                        type: C.MSG_REMOVE_ACCOUNT,
                        removeKey: deleteData.publicKey
                    });
                    setKey('');
                    setInvalidKey(null);
                }else{
                    setLoading(produce((s)=>{
                        s.opened = false;
                        s.text = null;
                    }));
                    setInvalidKey(true);
                }
            });
        }else{
            setInvalidKey(true);
            clearTimeout(tid);
            setTid(setTimeout(()=>{
                setInvalidKey(false);
            }, 2000));
        }
    }, [key, tid, deleteData.publicKey]);


    return <ModalStyle visible={deleteData.opened}>
        <div>
            <div className='deleteType'>
                <span>Delete Account?</span>
            </div>
            <div className='deleteType'>
                <div>It will remove the public and private key from this wallet.</div>
                <div className={'privatekey' + (invalidKey === true ? ' invalid-privatekey' : '')}>
                    <input type='password' 
                        placeholder="Enter your private key" 
                        value={key} 
                        onChange={(e)=>{setKey(e.target.value);}}
                    />
                </div>
            </div>
            <div>
                <Button variant="contained" color="secondary" size='small' onClick={close}>cancel</Button>
                <Button variant="contained" color="primary" size='small' onClick={confirm}>confirm</Button>
            </div>
            <CloseOutlinedIcon className='close-icon' onClick={close}/>
            <ErrorOutlineOutlinedIcon className='bg-icon deleteType'/>
        </div>
    </ModalStyle>
}


export const Main = (props)=>{
    const syncBackgroundState = useSetRecoilState(vState);
    const [pageNum, setPageNum] = useRecoilState(vPageNumX);
    const hasAccount = useRecoilValue(vHasAccount);
    const password = useRecoilValue(vPasswordX);
    const [isLoading, setLoading] = useRecoilState(vIsLoadingX);
    const setGErrData = useSetRecoilState(vGlobalErrorDataX);
    const setReceiverAddrList = useSetRecoilState(vReceiverAddrListX);

    useLayoutEffect(()=>{
        chrome.runtime.onMessage.addListener((msg)=>{
            const {type} = msg;
            switch(type){
                case C.FMSG_SYNC_BACKGROUND_STATE:{
                    delete msg.type;
                    syncBackgroundState((s)=>({...s, ...msg}));
                    break;
                }
                case C.FMSG_TRANSFER_PROGRESS: {
                    if(msg.value.step === 0){
                        setGErrData(produce((s)=>{
                            s.opened = true;
                            s.message = msg.value.lastError;
                        }));
                        setLoading({opened: false, text: null});
                    }
                    break;
                }
                case C.FMSG_RECEIVER_ADDR_LIST_UPDATED: {
                    setReceiverAddrList(msg.receiverAddrList);
                    break;
                }
            }

            return true;
        });
    }, []);

    useLayoutEffect(()=>{
        if(hasAccount === true){
            if(!!password === false){
                setPageNum(5);
            }else{
                setPageNum(pageNum<=8 ? 8 : pageNum);
            }
        }
    }, [hasAccount, password]);

    return <Wrapper>
        {pageNum === 0 && <CreateWalletInit />}
        {pageNum >= 1 && pageNum <= 3 && <CreateWalletStepper />}
        {pageNum >= 6 && pageNum <= 7 && <ImportWalletStepper />}
        <WalletDashboard visible={pageNum >= 8}/>
        <CreateWalletUnlock visible={pageNum === 5}/>
        <LoadingBox isLoading={isLoading.opened} loadingText={isLoading.text}/>
        <AlertModal />
        <ConfirmModal />
        <DeleteModal />
    </Wrapper>
}


ReactDOM.render(
    <Suspense fallback={<LoadingBox isLoading={true} />}>
        <RecoilRoot>
            <Main/>
        </RecoilRoot>
    </Suspense>, 
    document.getElementById('root')
);


