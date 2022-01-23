import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from "react";
import styled from "styled-components";
import produce from "immer";
import {useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {vPageNumX, vRecentReqkeysData, vIsLoadingX, vInfoDataX} from '../atoms';
import Button from '@material-ui/core/Button';
import C from "../../background/constant";


const Wrapper = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.75);
    left: 0px;
    top: 0px;
    z-index: 150;
    color: #eee;

    display: flex;
    flex-flow: column nowrap;
    justify-content: flex-start;
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
                    user-select: text;
                }

                &:nth-of-type(3){
                    text-align: right;
                    color: orange;
                }
            }

            &.from{
                >div:nth-of-type(2){
                    text-transform: uppercase;
                }
            }
            &.to{
                >div:nth-of-type(2){
                    text-transform: uppercase;
                }
            }

            &.title{
                font-weight: 600;
                font-size: 18px;
                text-align: center;
                margin-bottom: 20px;
                position: absolute;
                left: 50%;
                top: 50%;
                transform: translate(-50%,-50%) rotate(300deg);
                font-size: 64px;
                color: rgba(0,0,0,0.25);
                pointer-events: none;
            }
            
            &.confirm{
                
            }

            &.cancel{
                margin-top: 30px;
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

export default function({infoData, visible}){
    const [reqkeysData, setReqkeysData] = useRecoilState(vRecentReqkeysData);
    const setPageNum = useSetRecoilState(vPageNumX);
    const setLoading = useSetRecoilState(vIsLoadingX);
    const setInfoData = useSetRecoilState(vInfoDataX);

    return <Wrapper visible={visible}>
        <div>
            <div className='title'>Transaction</div>
            <div className='reqkey'>
                <div className='tag'>Reqkey: </div>
                <div>{infoData?.reqkey??''}</div>
            </div>
            <div className='from'>
                <div className='tag'>From: </div>
                <div>{infoData?.details?.senderAccountAddr??''}</div>
                <div>ChainId: {infoData?.details?.senderChainId??''}</div>
            </div>
            <div className='to'>
                <div className='tag'>To: </div>
                <div>{infoData?.details?.receiverAccountAddr??''}</div>
                <div>ChainId: {infoData?.details?.receiverChainId??''}</div>
            </div>
            <div className='amount'>
                <div className='tag'>Amount: </div>
                <div>{infoData?.details?.amount??''} KDA</div>
            </div>
            <div className='maxfee'>
                <div className='tag'>MaxTransactionFee:</div>
                <div>{(infoData?.details?.gasPrice??0) * (infoData?.details?.gasLimit??0)} KDA</div>
            </div>
            <div className='cancel'>
                <Button variant="contained" onClick={()=>{ 
                    setInfoData(produce((s)=>{
                        s.opened = false;
                    }));
                }}>Close</Button>
            </div>
        </div>
    </Wrapper>
}
