import React, {useState, useLayoutEffect, useCallback, useRef} from "react";
import {useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import styled from "styled-components";
import C from "../../background/constant";

import {
    vNetworkIdX, vLockupX, vAccAddrX, vAccountDetailsX, 
    vPageNumX, vIsLoadingX, vSidebarOpenedX
} from "../atoms.js";


import {VisibleStyleComp} from "./styled.comp.js";
import CoinSender from "./coin-sender.js";
import AccountDetails from "./account-details.js";
import ProgressTracker from "./transfer-progress-tracker";
import UserOption from "./user-option";
import Sidebar from "./sidebar";

import {CopiesButton} from "./special-buttons";
import MenuIcon from '@material-ui/icons/Menu';

import CallMadeIcon from '@material-ui/icons/CallMade';
import kadenaLogo from "../images/k64.png";
import LockIcon from '@material-ui/icons/Lock';

import GridOnIcon from '@material-ui/icons/GridOn';
import SyncIcon from '@material-ui/icons/Sync';
import HomeIcon from '@material-ui/icons/Home';
import TimelineIcon from '@material-ui/icons/Timeline';
import ExtensionSharpIcon from '@material-ui/icons/ExtensionSharp';

const Wrapper = styled.div`
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;

    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    align-items: center;

    opacity: 0;
    pointer-events: none;
    transition: all 0.24s;

    ${
        p => p.visible && `
            pointer-events: initial;
            opacity: 1;
        `
    }

    >div{
        position: relative;
        width: 100%;
        display: flex;
    }

    .lock-button,
    .refresh-button{
        position: fixed;
        right: 20px;
        bottom: 20px;

        width: 40px;
        height: 40px;
        z-index: 390;
        background-color: rgba(0,0,0,0.5);

        >svg{
            font-size: 24px;
            color: #eee;
        }

        &:hover{
            >svg{
                color: #333;
            }
            background-color: #eee;
        }
    }

    .refresh-button{
        bottom: 70px;
    }

    .lock-button{
        .lock-progress{
            position: absolute !important;
            left: 50%;
            top: 50%;
            transform: translate(-50%,-50%);
            width: 100%;
            height: 100%;


        }
    }
`;

const Body = styled.div`
    position: relative;
    flex-flow: column nowrap;
    background-color: #fff;
    flex: 1;
`;

const AccountInfo = styled.div`
    position: relative;
    display: flex;
    background-color: #ffffee;
    border-top: thin solid white;
    z-index: 365;
    width: 100%;
    flex-flow: row nowrap;
    padding: 15px 18px;
    height: 66px;

    align-items: flex-start;
    justify-content: space-between;

    >span{
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        

        &:nth-of-type(1){
            position: relative;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            justify-content: center;
            align-items: center;
            background-color: #fff;
            cursor: pointer;
            box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.16);
            transition: all 0.24s;

            svg{
                font-size: 23px;
            }

            &:hover{
                transform: scale(1.08);
                box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.24);
            }
        }
        &:nth-of-type(2){
            margin-top: 3px;
        }
    }
`;


const Dashboard = styled.div`
    position: relative;
    flex: 1;
    display: flex;
    left: 0px;
    top: 0px;
`;


const AccountBalanceWrapper = styled(VisibleStyleComp)`
    position: relative;
    width: 100%;
    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    height: 100%;

    >div{
        &:nth-of-type(1){
            box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.16);
            background-color: #fff;
            position: relative;
            width: 60px;
            height: 60px;
            border-radius: 50%;
            padding: 5px;
            margin-bottom: 30px;

            >img{
                /* COIN LOGO */
                position: relative;
                width: 100%;
                height: 100%;
                padding: 5px;
                object-fit: contain;
                user-drag: none;
                user-select: none;
            }
        }
        &:nth-of-type(2){
            text-align: center;
            margin-bottom: 38px;
                
            >div{
                max-width: 200px;
                word-break: break-all;
                &:nth-of-type(1){
                    /* KDA COUNT */
                    margin-bottom: 16px;
                    font-size: 24px;
                    font-weight: bold;
                }
                &:nth-of-type(2){
                    /* USD PRICE */

                }
            }
        }

        &:nth-of-type(3){
                /* qrcode */

        }

        &:nth-of-type(4){
                /* accountAddr */
                position: relative;
                
                width: 236px;
                user-select: none;
                background-color: white;     
                height: 50px;
                border-radius: 25px;
                padding: 0px 15px;

                display: flex;
                flex-flow: row nowrap;
                align-items: center;
                box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.1);
                margin-bottom: 60px;
    
                >span{
                    &:nth-of-type(1){
                        display: flex;
                        flex-flow: row nowrap;
                        justify-content: space-between;
                        align-items: center;
                        flex: 1;

                        >span{
                            
                                >div{
                                    &:nth-of-type(1){
                                        color: gray;
                                        font-weight: normal;
                                        font-size: 10px;
                                        display: flex;
                                        flex-flow: row nowrap;
                                        align-items: center;
                                        line-height: 1rem;
                                    }
                                    &:nth-of-type(2){
                                        font-weight: bold;
                                        color: black;
                                        display: flex;
                                        flex-flow: row nowrap;
                                        align-items: center;
                                        font-size: 15px;
                                        text-transform: uppercase;
                                    }
                                }
                        }

                    }

                }
            
        }
    }
`;


const CircleButton = styled.section`
    position: relative;
    cursor: pointer;
    border-radius: 50%;
    width: 32px;
    height: 32px;
    display: flex;
    justify-content: center;
    align-items: center;
    
    opacity: 1;
    box-shadow: 1px 1px 3px 2px rgba(0,0,0,0.16);
    margin-left: 10px;
    
    background-color: #fff;
    color: #333;

    transition: all 0.18s;
 
    &:nth-of-type(1){
        margin-left: 0px;
    }

    &:hover{
        background-color: #333;
        color: #fff;
    }

    &.active{
        background-color: #333;
        color: #fff; 
    }
`;


const InterActions = styled.div`
    position: relative;
    width: 100%;
    min-height: 56px;
    display: flex;
    padding: 10px 20px;
    background: #C9FFBF; 
    background: -webkit-linear-gradient(to top, #FFAFBD, #C9FFBF); 
    background: linear-gradient(to top, #FFAFBD, #C9FFBF); 
    filter: drop-shadow(0px 3px 3px rgba(0, 0, 0, .5)); 
    
    z-index: 360;

    flex-flow: row nowrap;
    justify-content: space-around;
`;


const NetDropdownWrapper = styled.div`
        /* testnet */
        position: relative;
        display: flex;
        flex-flow: column nowrap;
        justify-content: flex-start;
        border-radius: 4px;

        /*
        border-bottom-left-radius: 4px;
        border-bottom-right-radius: 4px;
        */
        
        font-size: 12px;
        background-color: rgba(255,255,255,1);
        box-sizing: border-box;
        cursor: pointer;
        border: thin solid #aaa;
        overflow:hidden;
        font-weight: 600;
        text-transform: uppercase;


        >div{
            display: flex;
            flex-flow: row nowrap;
            position: relative;

            >span{
                text-overflow: ellipsis;
                white-space: nowrap;
                overflow: hidden;
                display: inline;
                align-items: center;
                jutify-content: center;
                user-select: none;
                width: 80px;
            }
            
            &:last-of-type{
                border-bottom: none;
            }
            
            &:nth-of-type(1){
                padding: 3px 32px 3px 20px;
                align-items: center;

                &:before{
                    content: '';
                    position: absolute;
                    left: 0px;
                    top: 50%;
                    transform: translateY(-50%) scale(0.32);
                    width: 20px;
                    height: 20px;
                    background-color: red;
                    border-radius: 50%;
                }

                &:after{
                    content: '';
                    position: absolute;
                    right: 10px;
                    top: 50%;
                    transform: translateY(-25%);
                    font-weight: 600;
                    border: 4px solid transparent;
                    border-top: 5px solid rgba(0,0,0,0.66);
                    border-radius: 2px;
                }
                
            }
            &:nth-of-type(2){
                /* main-menu */
                position: relative;
                background-color: rgba(0,0,0,0.01);
                display:flex;
                flex-flow: column nowrap;
                width: 100%;
                left: 0px;
          
                overflow: hidden;
                max-height: 0px;
                transition: all 0.3s ease;

                >div{
                    padding: 3px 32px 3px 20px;
                    position: relative;

                    display: flex;
                    flex-flow: row nowrap;
                    align-items: center;

                    >span{
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        overflow: hidden;
                        display: inline;
                        align-items: center;
                        jutify-content: center;
                        user-select: none;
                        width: 80px;
                    }

                    &:first-of-type{
        
                    }

                    &:last-of-type{
                        border-bottom: none;
                    }

                    &:hover{
                        background-color: rgba(0,0,0,0.06);
                    }

                    &.selected{
                        background-color: rgba(0,0,0,0.06);
                    }
                }
            }

            
            ${(p)=>p.activate===true && `
                &:nth-of-type(1){

                }
                &:nth-of-type(2){
                    max-height: 200px;
                }
            `}
            

        }
`;



const NetDropdown = ({defaultValue, options, onChange}) => {
    const [state, setState] = useState((options[options.findIndex(v=>v.value===defaultValue)])?.key??0);
    const [opened, setOpened] = useState(false);
    const thisRef = useRef(null);
    const isInit = useRef(false);
    

    useLayoutEffect(()=>{
        const clickHandle = (e)=>{
            if(e.path.includes(thisRef.current) === false){
                setOpened(false);
            }
        }
        document.body.addEventListener('click', clickHandle);

        return ()=>{
            document.body.removeEventListener('click', clickHandle);
        }
    }, [])


    useLayoutEffect(()=>{
        if(isInit.current === true && onChange){
            onChange(options[state]?.value, options[state]);
        }
        isInit.current = true;
    }, [state]);

    return <NetDropdownWrapper activate={opened} ref={thisRef}>
        <div onClick={()=>setOpened(s=>!s)}>
            <span>{options[state]?.text}</span>
        </div>
        <div>
            {
                options.map((v,i)=>{
                    return <div key={v.key} className={state===v.key ? 'selected' : ''} 
                                onClick={()=>{setState(v.key); setOpened(false); }}
                                title={v.text}
                            >
                        <span>{v.text}</span>
                    </div>
                })
            }
        </div>
    </NetDropdownWrapper>
}


const AccountBalance = ({balance=0, price=0, children, accountAddr, visible}) => {
    const [copied, setCopied] = useState(false);
    const [tid, setTid] = useState(0);
 
    useLayoutEffect(()=>{
        if(copied === true){
            setTid((t)=>{
                clearTimeout(t);
                return setTimeout(()=>setCopied(false),2400);
            });
        }
    },[copied])


    return <AccountBalanceWrapper visible={visible}>
        <div>
            <img src={kadenaLogo}/>
        </div>
        <div>
            <div>{Number(balance).toFixed(4)} KDA</div>
            <div>${(Number(balance) * Number(price)).toFixed(4)} USD</div>
            <div>${price} USD</div>
        </div>
        <div style={{display:'none'}}>
            
        </div>
        <div>
            <span>
                <span>
                    <div>Your Account:</div>
                    <div>
                        <span>{(accountAddr.slice(0,8)+' ... ' + accountAddr.slice(-8)).toLowerCase()}</span>
                    </div>
                </span>
                <CopiesButton style={{marginRight:'-10px'}} text={accountAddr}/>
            </span>
        </div>
    </AccountBalanceWrapper>
}


const LockProgressBarStyle = styled.div`
    position: absolute;
    width: 100%;
    height: 3px;
    background-color: transparent;
    bottom: 0px;
    z-index: 3000;
    pointer-events: none;
    opacity: 0.68;

    >div.bar{
        position: relative;
        width: 100%;
        height: 100%;
        background: #00F260; 
        background: -webkit-linear-gradient(to right, #0575E6, #00F260);  
        background: linear-gradient(to right, #0575E6, #00F260);
        transition: all ${p=>p.interval||5}s;
    }
`;

export function LockProgressBar(){
    const [pstate, setPstate] = useState(100);

    useLayoutEffect(()=>{
        const fn = (msg)=>{
            if(msg.type === C.FMSG_LOCK_PROGRESS_STATE){
                setPstate(msg.value);
            }
            return true;
        };
        chrome.runtime.onMessage.addListener(fn);

        return ()=>{
            chrome.runtime.onMessage.removeListener(fn);
        }
    }, []);

    return <LockProgressBarStyle interval={5}>
        <div className='bar' style={{width: pstate + '%'}}></div>
    </LockProgressBarStyle>
}


export default function({visible}){
    const accountAddr = useRecoilValue(vAccAddrX);
    const accountDetails = useRecoilValue(vAccountDetailsX);
    const setLoading = useSetRecoilState(vIsLoadingX);
    const lockUp = useSetRecoilState(vLockupX);
    const [interActionNo, setInterActionNo] = useRecoilState(vPageNumX);
    const [networkId, setNetworkId] = useRecoilState(vNetworkIdX);
    const [sidebarOpened, setSidebarOpened] = useRecoilState(vSidebarOpenedX);
    const [kdaPrice, setKdaPrice] = useState(0.00);

    useLayoutEffect(()=>{
        chrome.runtime.onMessage.addListener((message,sender,sendResponse)=>{
            let {type,key,value} = message;
            switch(type){
                case C.FMSG_KDA_PRICE_UPDATE: {
                    setKdaPrice(value);
                    break;
                }
            }
            return true;
        })
    },[]);

    const onNetworkChange = useCallback((v)=>{
        setLoading({opened: true, text: null});
        setNetworkId(v);
        //refreshAccountDetails();
    },[accountAddr, networkId]);

    const refreshAccountDetails = useCallback(()=>{
        setLoading({opened: true, text: null});
        chrome.runtime.sendMessage({
            type: C.MSG_GET_ACCOUNT_DETAILS, 
            accountId: accountAddr
        });       
    },[accountAddr, networkId]);

    return <Wrapper visible={visible}>
       <Body>
            <AccountInfo>
                <span className='MenuButton' onClick={()=>setSidebarOpened(true)}>
                    <MenuIcon />
                </span>
                <span>
                    <NetDropdown options={[
                        {key: 0, text:'Mainnet', value:'mainnet01'},
                        {key: 1, text:'Testnet', value:'testnet04'},
                        //{key: 2, text:'localhost:8080', value:'localhost:8080'}
                    ]} onChange={onNetworkChange} defaultValue={networkId} />
                </span>
            </AccountInfo>
            <InterActions>
                <CircleButton onClick={()=>{ setInterActionNo(8) }} className={interActionNo==8 && 'active' }>
                    <HomeIcon/>
                </CircleButton>
                <CircleButton onClick={()=>{ setInterActionNo(9) }} className={interActionNo==9 && 'active' }>
                    <GridOnIcon />
                </CircleButton>
                <CircleButton onClick={()=>{ setInterActionNo(10) }} className={interActionNo==10 && 'active' }>
                    <CallMadeIcon />
                </CircleButton>
                <CircleButton onClick={()=>{ setInterActionNo(11) }} className={interActionNo==11 && 'active' }>
                    <TimelineIcon />
                </CircleButton>
                <CircleButton onClick={()=>{ setInterActionNo(12) }} className={interActionNo==12 && 'active' }>
                    <ExtensionSharpIcon />
                </CircleButton>
            </InterActions>
            <Dashboard>
                <AccountBalance accountAddr={accountAddr} balance={(accountDetails?.sum??0)} price={kdaPrice} visible={interActionNo === 8}/>
                <AccountDetails details={(accountDetails?.details??[])} accountAddr={accountAddr} visible={interActionNo === 9} />
                <CoinSender visible={interActionNo === 10} />
                <ProgressTracker visible={interActionNo === 11} />
                <UserOption visible={interActionNo === 12} />
            </Dashboard>
            <LockProgressBar />
            <Sidebar visible={sidebarOpened}/>
       </Body>

       <CircleButton onClick={refreshAccountDetails} className='refresh-button'>
            <SyncIcon fontSize='medium'/>
        </CircleButton>
        <CircleButton onClick={e=>lockUp(true)} className='lock-button'>
            <LockIcon fontSize='medium'/>
        </CircleButton>
    </Wrapper>
}