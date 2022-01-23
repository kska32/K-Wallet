import React, {useCallback} from "react";
import styled from "styled-components";
import produce from "immer";
import {useRecoilState, useSetRecoilState} from 'recoil';
import {vPageNumX, vRecentReqkeysData, vIsLoadingX} from '../atoms';
import Button from '@material-ui/core/Button';
import C from "../../background/constant";
import {format} from "./component-utils";


const Wrapper = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.8);
    left: 0px;
    top: 0px;
    color: #eee;
    z-index: 320;

    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;
    padding: 20px;
    opacity: 0;

    transition: all 0.12s;
    pointer-events: none;
    transform: scale(0.8);

    ${
        (p) => {
            if(p.visible){

                return `
                    opacity: 1;
                    pointer-events: initial;
                    transform: scale(1);
                `
            }
        }
    }

    >div{
        padding: 20px;
        width: 100%;
        border-radius: 5px;

        >div{
            margin: 5px 0px;
            display: flex;
            flex-flow: column wrap;
            justify-content: space-between;

            >div{
                word-break: break-word;

                &.tag{
                    font-size: 12px;
                    color: #999;
                }

                &:nth-of-type(2){
                    text-align: right;
                    text-transform: uppercase;
                }

                &:nth-of-type(3){
                    text-align: right;
                }
            }


            &.from{

            }
            &.title{
                font-weigth: 600;
                font-size: 18px;
                text-align: center;
                margin-bottom: 30px;
            }
            
            &.confirm{
                
            }

            &.cancel{
                margin-top: 10px;
            }


            &.amount{
               
                >div:nth-of-type(2){
                    margin-bottom: 10px;
                }
            }
            &.maxfee{
                margin-bottom: 10px;
            }
        }

    }
`;



export default function({data, visible, cancelConfirm}){
    const [reqkeysData, setReqkeysData] = useRecoilState(vRecentReqkeysData);
    const setPageNum = useSetRecoilState(vPageNumX);
    const setLoading = useSetRecoilState(vIsLoadingX);
    
    const TransferConfirm = useCallback(() => {
        setLoading(produce((s)=>{
            s.opened = true;
            s.text = null;
        }));
        chrome.runtime.sendMessage({
            type: C.MSG_JUST_TRANSFER, 
            data: data  //=> transferOpt
        });

        
        const handler = (message) => {
            let {type,key,value} = message;
            switch(type){
                case C.FMSG_TRANSFER_PROGRESS: {
                    if(value.step === 1){
                        chrome.runtime.sendMessage({
                            type: C.MSG_GET_RECENT_REQKEYS_DATA, 
                            limit: reqkeysData.length + 1
                        }, (res)=>{
                            chrome.runtime.onMessage.removeListener(handler);
                            setLoading(produce((s)=>{ s.opened = false; s.text = null; }));
                            cancelConfirm();
                            setReqkeysData(res);
                            setPageNum(11);
                        })
                    }else if(value.step === 0){
                        chrome.runtime.onMessage.removeListener(handler);
                        setLoading(produce((s)=>{ s.opened = false; s.text = null; }));
                        cancelConfirm();
                    }
                    break;
                }
            }
        }
        
        chrome.runtime.onMessage.addListener(handler);
        
    }, [data, reqkeysData]);


    return <Wrapper visible={visible}>
        <div>
            <div className='title'>Confirm Transaction</div>
            <div className='from'>
                <div className='tag'>From: </div>
                <div>{data?.senderAccountAddr??''}</div>
                <div>ChainId: {data?.senderChainId??''}</div>
            </div>
            <div className='to'>
                <div className='tag'>To: </div>
                <div>{data?.receiverAccountAddr??''}</div>
                <div>ChainId: {data?.receiverChainId??''}</div>
            </div>
            <div className='amount'>
                <div className='tag'>Amount: </div>
                <div>{data?.amount??''} KDA</div>
            </div>
            <div className='maxfee'>
                <div className='tag'>MaxTransactionFee:</div>
                <div>{format((data?.gasPrice??0) * (data?.gasLimit??0))} KDA</div>
            </div>
            <div className='confirm'>
                <Button variant="contained" color="primary" onClick={TransferConfirm}>Confirm</Button>
            </div>
            <div className='cancel'>
                <Button variant="contained" color="secondary" onClick={cancelConfirm}>Cancel</Button>
            </div>
        </div>
    </Wrapper>
}
