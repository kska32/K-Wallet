import React, {useState, useMemo, useLayoutEffect, useCallback, useRef} from "react";
import {useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import styled from "styled-components";
import C from "../../background/constant";
import moment from "moment";
import {vRecentReqkeysDataX, vAccountDetailsX, vAccAddrX, vErrorDataX, vInfoDataX} from "../atoms.js";
import {VisibleStyleComp} from "./styled.comp.js";
import ErrorHandle from "./error-handle";
import BuildOutlinedIcon from '@material-ui/icons/BuildOutlined';
import {original, produce} from 'immer';

import ErrorOutlineOutlinedIcon from '@material-ui/icons/ErrorOutlineOutlined';
import NewReleasesOutlinedIcon from '@material-ui/icons/NewReleasesOutlined';
import MoreOutlinedIcon from '@material-ui/icons/MoreOutlined';
import ExploreOutlinedIcon from '@material-ui/icons/ExploreOutlined';
import TransactionInfo from './transaction-info';
import CloseSharpIcon from '@material-ui/icons/CloseSharp';

const Transactions = styled(VisibleStyleComp)`
    position: absolute;
    display: flex;
    width: 100%;
    height: 100%;
    display: flex;
    flex-flow: column nowrap;
    left: 0px;
    top: 0px;
    user-select: none;

    >div{
        position: relative;
        display: flex;

        &:nth-of-type(1){
            /* transactions-box */
            flex-flow: row nowrap;
            align-items: flex-start;
            justify-content: center;
            width: 100%;
            height: 100%;
            background-color: #eee;
            color: #666;
            box-sizing: border-box;
            padding: 20px 20px;
            border-top: thin solid rgba(0,0,0,0.2);
            overflow-x: hidden;
            overflow-y: auto;
            
            &::-webkit-scrollbar {
                width: 0px;
            }
        }
    }
`;


const StepProgressBarStyle = styled.div`
    position: relative;
    display: flex;
    flex-flow: row nowrap;
    justify-content: space-between;

    >div:nth-of-type(1){
        position: absolute;
        width: 100%;
        height: 6px;
        background-color: rgba(0,0,0,0.06);
        background-size: 100% 80%;
        top: 50%;
        transform: translateY(-50%);
        z-index: 1;
        border-radius: 1.5px;
        box-sizing: border-box;
        display: flex;
        flex-flow: row nowrap;
        padding-left: 10px;
        padding-right: 10px;

        &:after{
            content: '';
            position: relative;
            height: 100%;
            background: ${p=>p?.color??'black'};
            flex-basis: 0%;
            transition: all 0.24s;

            ${
                (p)=>{
                    if(p.step!==undefined){
                        return `
                            flex-basis: ${ p.progress + '%;'}
                        `
                    }
                }
            }
        }
    }

    >span{
        position: relative;
        z-index: 3;
        width: 13px;
        height: 13px;
        border-radius: 50%;
        display: flex;
        justify-content: center;
        align-items: center;
        box-shadow: 0px 0px 0px 1px ${p=>p?.color??'black'};
        font-size: 12px;
        font-weight: 600;
        user-select: none;
        transition: all 0.24s;
        background-color: #eee;
        color: #333;

        &:before{
            display: none !important;
        }


        &:nth-of-type(even){
            opacity: 0;
            background-color: transparent;
            color: black;
            box-shadow: 0px 0px 0px 0px;
            overflow: visible;
            
            &:after{
                opacity: 0;
                pointer-events: none;
                cursor: pointer;
            }
        }

        &:nth-of-type(odd){
            &.prevstep,
            &.laststep{
                &:after{
                    content: '✓';
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    width: 100%;
                    height: 100%;
                    background-color: ${p=>p?.color??'transparent'};
                    transform:translate(-50%,-50%);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    line-height: 0;
                    border-radius: 50%;
                }

                &.interrupted{
                    &:after{
                        opacity: 0;
                        pointer-events: none;
                    }
                }
            }
        }

        &.prevstep{
            pointer-events: none;
        }

        &.prevstep,
        &.laststep{
            background-color:#009688;
            color: white;
            font-weight: 600;

            svg{
                &.lastStepErrored{
                    z-index: 1;
                    position: absolute;
                    left: 50%;
                    top: 50%;
                    transform: translate(-50%,-50%);
                    background-color: #BA1200;
                    border-radius: 50%;
                    color: #eee;
                    font-weight: bold;
                    font-size: 20px;
                    padding: 2px;
                    cursor: pointer; 
                }
            }
        }

        &.laststep{
            opacity: 1 !important;
            svg{
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%,-50%);
                background-color: #BA1200;
                border-radius: 50%;
                color: #eee;
                font-weight: bold;
                font-size: 20px;
                padding: 2px;
                cursor: pointer; 
            }
        }

        ${(p)=>{
            if(p.lastStepErrored === true){
                return `
                    /*
                    &:last-of-type{
                        background-color:#009688;
                        &:after{
                            content: '✗' !important;
                        }
                    }
                    */
                `
            }
        }}
    }
`;

const vstep = (d) => (d.step - (d.lastError ? 0.5 : 1)) * 2;
const tstep = (d) => (d.tstep * 2 - 1);

const interrupted = (d, tp = 1000 * 60 * 3) => 
            Date.now() - d.updateTimestamp >= tp && 
                (!d?.responds?.slice(-1)[0]?.result?.error) &&
                     d.success === false && d.finished === false && 
                            d.tstep > d.step && d.lastError === null;


function StepProgressBar({item}){
    const isInit = React.useRef(false);
    const [data, setData] = useState(item);
    const [step, setStep] = useState(vstep(data));// converted step.
    const [steplen] = useState(tstep(data));
    const [reqkey] = useState(data.reqKey);
    const setErrorDataX = useSetRecoilState(vErrorDataX);
    
    const [lastError, setLastError] = useState(data.lastError+'');
    const lastStepErrored = useMemo(()=>{
        const isok = (data?.responds?.slice(-1)[0]?.result?.error?.message??'')
                                            .includes("resumePact: pact completed");
        return data.success === false && data.finished === true && !isok;
    }, [data.success, data.finished]);

    useLayoutEffect(()=>{
        const listenerHandler = (message,sender,sendResponse)=>{
            let {type,key,value} = message;
            
            switch(type){
                case C.FMSG_TRANSFER_PROGRESS: {
                    if(reqkey === key){
                        setData(value);
                        setLastError(value.lastError);
                        setStep(vstep(value));
                    }
                    break;
                }
            }
        }

        if(reqkey !== null && isInit.current === false){
            isInit.current = true;
            chrome.runtime.onMessage.addListener(listenerHandler);
        }

        return ()=>{
            chrome.runtime.onMessage.removeListener(listenerHandler);
        }
    },[reqkey]);

    return <StepProgressBarStyle 
                step={step} 
                color='#009688' 
                stepCount={steplen} 
                progress={step % steplen / (steplen - 1) * 100}
                error={true}
                lastStepErrored={lastStepErrored}
                hasLastError={!!lastError}
            >
                <div></div>
                {
                    new Array(steplen).fill(0).map((v,i,r)=>{
                        if(i % 2){
                            //gots error
                            return <span key={i} 
                                className={step>i ? 'prevstep' : (step===i ? 'laststep' : '') }
                            >
                                {
                                    step >= i && <ErrorOutlineOutlinedIcon 
                                        onClick={()=>{ 
                                            setErrorDataX(produce((s)=>{ 
                                                s.opened = true;
                                                s.message = data.lastError;
                                                s.details = data;
                                            })); 
                                        }}
                                    />
                                }
                            </span>
                        }else{
                            return <span key={i} 
                                className={
                                    (
                                        step>i ? 'prevstep' : (
                                            step===i ? ('laststep' + (interrupted(data) ? ' interrupted' : '')) : '')
                                    ) 
                                }
                            >
                                { Math.ceil((i + 1)/2) }
                                { step === i && interrupted(data) && 
                                    <ErrorOutlineOutlinedIcon className="interrupted" 
                                        onClick={()=>{ 
                                            setErrorDataX(produce((s)=>{ 
                                                s.opened = true;
                                                s.message = "TIME OUT(180secs)  - ERROR";
                                                s.details = data;
                                            })); 
                                        }
                                    }/> 
                                }
                                { r.length - 1 === i && lastStepErrored === true && <ErrorOutlineOutlinedIcon className="lastStepErrored" /> }
                            </span>
                        }
                    })
                }
    </StepProgressBarStyle>
}


const Wrapper = styled.div`
    position: relative;
    width: 100%;
`;


const StepInfosItem = styled.div`
    position: relative;
    margin-bottom: 20px;
    font-size: 10px;
    color: #333;
    padding: 10px;
    border-radius: 8px;
    background-color: #fff;
    box-shadow: 0px 1px 5px 3px rgba(0,0,0,0.12);

    &:nth-last-of-type(2){
        margin-bottom: 108px;
    }

    >div{
        display: flex;
        flex-flow: row nowrap;
        justify-content: space-between;
        margin-bottom: 7px;

        &:last-of-type{
            margin-bottom: 0px;
        }

        >span{
            text-overflow: ellipsis;
            white-space: nowrap;
            font-weight: bold;
            overflow: hidden;
 
            &:before{
                content: '';
                width: 10px;
                height: 10px;
                position: relative;
                border-radius: 50%;
                display: inline-flex;
                background-color: #009688;
                transform: translateY(8%) scale(0.6);
            }
        }
        &:nth-of-type(1){
            >span{
                &:nth-of-type(1){

                }
                &:nth-of-type(2){

                }
            }
            svg.delete{
                color: #009688;
                cursor: pointer;
                font-size: 16.5px;
                transform: scale(0.8);
                &:hover{
                    color: #000;
                }
            }
        }
        &:nth-of-type(2){
            >span{

                &:nth-of-type(1){
                    &:before{
                        display: none;
                    }
                    >span{
                        font-weight: bold;
                        align-self: center;
                        &:before{
                            content: '';
                            width: 10px;
                            height: 10px;
                            position: relative;
                            border-radius: 50%;
                            display: inline-flex;
                            background-color: #009688;
                            transform: translateY(8%) scale(0.6);
                        }

                        &:nth-of-type(1){
                            text-transform: uppercase;
                        }
                        &:nth-of-type(2){
                            margin-left: 20px;
                            text-transform: uppercase;
                        }
                    }

                }
                &:nth-of-type(2){
                    
                }
            }

        }

        &:nth-of-type(3){
            display: flex;
            flex-flow: row nowrap;
            align-items: center;
            
            >*{
                display: flex;
                flex-flow: row nowrap;
                align-items: center;
            }

            >div{
                flex: 1;

            }
            >svg{
                margin-left: 5px;
                color: #009688;
                cursor: pointer;

                &:hover{
                    color: black;
                }

                &:nth-of-type(1){
                    margin-left: 10px;
                }

            }
        }
    }

`;

const NoTransaction = styled.div`
    position: fixed;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);

    font-size: 20px;
    white-space: nowrap;
    margin-top: -30px;
    color: rgba(0,0,0,0.36);
    font-weight: bold;
    transition: all 0.18s;

    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;
    opacity: 0;
    pointer-events: none;
    

    ${p=>p.visible===true && `
        opacity: 1;
        pointer-events: initial;
    `}

    svg{
        font-size: 52px;
        margin-bottom: 20px;
    }

`;


const LoadMoreMark = ({rootRef, style, visibleCallback, hiddenCallback}) => {
    const $Mark = React.useRef();

    React.useLayoutEffect(()=>{
        if(visibleCallback){
            let options = {
                root: rootRef.current,
                // rootMargin: '0px 0px -90% 0px',
                threshold: 0
            }

            let observer = new IntersectionObserver((entries) => {
                entries.forEach((v) => {
                    if(v.isIntersecting){
                        visibleCallback && visibleCallback();
                    }
                });
            }, options);

            observer.observe($Mark.current);

            return ()=>observer.unobserve($Mark.current);
        }
    },[visibleCallback, rootRef]);

    return <div ref={$Mark} style={{
        position:'relative',
        width:'100%',
        height:'1px',
        ...style
    }}/>
}


export default React.memo(({visible})=>{
    const [reqkeysData, setReqkeysData] = useRecoilState(vRecentReqkeysDataX);
    const [hasMore, setHasMore] = useState(true);
    const errorData = useRecoilValue(vErrorDataX);
    const [infoData, setInfoData] = useRecoilState(vInfoDataX);
    const rootRef = useRef();

    const onLoadMore = useCallback(()=>{
        if(hasMore){
            chrome.runtime.sendMessage({
                type: C.MSG_GET_RECENT_REQKEYS_DATA, 
                limit: reqkeysData.length + 5
            }, (res)=>{
                if(res.length !== reqkeysData.length){
                    setReqkeysData(res);
                }else{
                    setHasMore(false);
                }
            })
        }
    },[reqkeysData, hasMore]);

    const exploreLink = useCallback((reqKey,networkId)=>{
        const networkName = networkId.indexOf("mainnet") > -1 ? 'mainnet' : 'testnet';
        return  `https://explorer.chainweb.com/${networkName}/tx/${reqKey}`;
    },[])

    return <Transactions visible={visible}>
            <div>
                <Wrapper>
                {
                    reqkeysData.map((v,i)=>{
                        return <StepInfosItem key={v.key}>
                            <div>
                                <span>Rk: {(v?.reqKey??'').slice(0,8)}</span>
                                <span>{moment(v.timestamp).format("LL - LTS")}</span>
                                <CloseSharpIcon className='delete' onClick={()=>{
                                    if(v?.reqKey){
                                        chrome.runtime.sendMessage({
                                            type: C.MSG_REMOVE_A_TX_RESULT, 
                                            deleteKey: v.reqKey
                                        },(res)=>{
                                            if(res === true){
                                                setReqkeysData(produce((s)=>{ s.splice(i,1) }));
                                            }
                                        });
                                    }
                                }}/>
                            </div>
                            <div>
                                <span>
                                    <span>Fr: {(v?.param?.senderAccountAddr??'').slice(0,8)} - C{v?.param?.senderChainId??''}</span>
                                    <span>To: {(v?.param?.receiverAccountAddr??'').slice(0,8)} - C{v?.param?.receiverChainId??''}</span>
                                </span>
                                <span style={{maxWidth: '100px'}}>
                                    {v?.param?.amount??0} KDA
                                </span>
                            </div>
                            <div>
                                <StepProgressBar item={v} />
                                <ExploreOutlinedIcon onClick={()=>{
                                    window.open(exploreLink(v.reqKey, v.param.networkId), "_blank")
                                }}/>
                                <MoreOutlinedIcon onClick={()=>{
                                    setInfoData(produce((s)=>{ 
                                        s.opened = true;
                                        s.details = v.param;
                                        s.reqkey = v.reqKey;
                                    })); 
                                }} />
                            </div>
                        </StepInfosItem>
                    })
                } 
                    <LoadMoreMark rootRef={rootRef} visibleCallback={onLoadMore}/>
                </Wrapper>
                <NoTransaction visible={reqkeysData.length===0}>
                    <NewReleasesOutlinedIcon />
                    <div>No Transactions</div>
                </NoTransaction>
                <ErrorHandle visible={(errorData?.opened??false)} errorData={errorData} />
                <TransactionInfo visible={(infoData?.opened??false)} infoData={infoData} />
            </div>
        </Transactions>
});