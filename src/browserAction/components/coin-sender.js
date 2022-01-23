import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from "react";
import styled from "styled-components";
import {produce,original} from "immer";

import { Input, Dropdown, Button as ButtonSUI } from 'semantic-ui-react';
import Slider from '@material-ui/core/Slider';
import Button from '@material-ui/core/Button';

import {useRecoilState, useRecoilValue, useSetRecoilState} from 'recoil';
import {
    vAccountDetailsX, vTransferOptX, vConfirmOpenedX, 
    vSenderAddrListX, vReceiverAddrListX
} from '../atoms';
import TransferConfirm from "./confirm-transfer";
import {VisibleStyleComp} from "./styled.comp.js";
import C from "../../background/constant";
import {format} from "./component-utils";

const CoinSenderWrapper = styled(VisibleStyleComp)`
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;
   
    background-color: #eee;
    box-sizing: border-box;
    display: flex;
    flex-flow: column nowrap;

    div.row-item{
        position: relative;
        display: flex;
        flex-flow: row nowrap;
        padding-bottom: 10px;

        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        .ui.dropdown{
            *{
                text-transform: uppercase;
            }
            input.search{
                text-transform: uppercase;
                &::placeholder{
                    text-transform: uppercase;
                }
            }
            .divider.default.text{
                text-transform: unset !important;
            }

            &.active.selection{
                text-transform: uppercase;
            }
            &.disabled{
                opacity: 1;
                color: #000;
                text-shadow: 0px 0px 1px rgba(0,0,0,0.5);
                background-color: #bcf0da;
                user-select: none;
                border: thin solid transparent;

                >.dropdown.icon{
                    color: gray;
                }
            }

        }

        /* Firefox */
        input[type=number] {
            -moz-appearance: textfield;
        }

        &.group{
            border: 1px solid rgba(34,36,38,.15);
            padding: 15px 20px;
            border-radius: 5px;
            background-color: rgba(255,255,255,0.75); 
        }

        &.row{
            flex-direction: row;
        }

        &.column{
            flex-direction: column;
        }

        &.br{
            margin-top: 15px;
            border-top: 3px dashed lightgray;
            padding-top: 15px;
        }

        .hint-balance{
            color: green;
            margin-left: 5px;
        }

        &.amount{
            .amount-input-ui{
                >input{
                    padding-right: 50px !important;

                }
                >div.ui.basic.label{

                    >div{
                        >span{
                            &:nth-of-type(1){
                                /* max button */
                                position: absolute;
                                right: 66px;
                                font-size: 10px;
                                text-transform: capitalize;
                                color: red;
                                border: thin solid red;
                                border-radius: 5px;
                                padding: 3px;
                                top: 50%;
                                transform: translateY(-50%);
                                user-select: none;
                                cursor: pointer;
                                background-color: transparent;
                                transition: all 0.12s;

                                &:hover{
                                    background-color: red;
                                    color: white;
                                }
                            }
                            &:nth-of-type(1){
                                /* KDA label */
                            }
                        }
                    }
                }
            }
        }

        &.transaction{
            overflow-x: hidden;
        }

        &.fee{
            >span{
                &:nth-of-type(1){
                    color: rgba(0,0,0,0.5);
                    font-size: 13px;
                    margin-left: 5px;
                }
                &:nth-of-type(2){
                    margin-left: initial;
                    padding: 7px 14px;
                    border-radius: 5px;
                    color: white;
                    font-weight: 600;
                    text-shadow: 0px 0px 3px rgba(0,0,0,0.86);
                    margin-bottom: 10px;
                    user-select: none;

                    background: #00C9FF; 
                    background: -webkit-linear-gradient(to right, #92FE9D, #00C9FF); 
                    background: linear-gradient(to right, #92FE9D, #00C9FF); 

                }
            }
        }

        &.hidden{
            display: none;
        }

        &.text-overflow {
            .ui.dropdown{
               
                >div{
                    &.divider.text{
                        max-width: 168px;
                        text-overflow: ellipsis;
                        overflow: hidden;
                        white-space: nowrap;
                    }

                    &[role=listbox]{

                        >div[role=option]{
                            >span.text{
                                max-width: 168px;
                                text-overflow: ellipsis;
                                overflow: hidden;
                                white-space: nowrap;
                                display: inline-block;
                            }
                            
                        }
                    }
                }
            }
        }


        span.MuiSlider-markLabel{
            font-size: 10px;
            color: rgba(0,0,0,0.3);
        }

        input{
            white-space: nowrap;
            text-overflow: ellipsis;
            overflow: hidden;
        }

        &.flex1{
            flex: 1;

            >input{
                padding-left: 0px;
                padding-right: 0px;
            }
        }

        >span{
            display: flex;
            flex-flow: column nowrap;

            &:nth-of-type(1){
                flex: 1;
            }

            &:nth-of-type(2){
                margin-left: 10px;
            }

            >div{
                &:nth-of-type(1){
                    /* label */
                    color: rgba(0,0,0,0.5);
                    font-size: 13px;
                    margin-left: 5px;
                }
                &:nth-of-type(2){
                    /* dropdown */
                }
            }
        }
    }


`;

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    top: 0px;
    overflow: auto;
    overflow-x: hidden;
    padding: 15px 20px;

    &::-webkit-scrollbar {
        width: 0px;
    }
`;



export default function CoinSender({visible}){
    const [transferOpt, setTransferOpt] = useRecoilState(vTransferOptX); 
    const [confirmOpened, setConfirmOpened] = useRecoilState(vConfirmOpenedX);
    const [senderAddrList, setSenderAddrList] = useRecoilState(vSenderAddrListX);
    const [receiverAddrList, setReceiverAddrList] = useRecoilState(vReceiverAddrListX);
    const accountDetails = useRecoilValue(vAccountDetailsX);

    const maxBalanceAmount = useMemo(()=>
        accountDetails?.details?.[transferOpt?.senderChainId??0]?.balance??0,
        [transferOpt?.senderChainId??0, accountDetails]
    );

    const maxTransactionFee = useMemo(()=>
        format(transferOpt.gasPrice * transferOpt.gasLimit), 
        [transferOpt.gasPrice, transferOpt.gasLimit]
    );

    const isCrossTransfer = useMemo(()=>transferOpt.senderChainId !== transferOpt.receiverChainId,[
        transferOpt.senderChainId, transferOpt.receiverChainId
    ]);

    const chainIdList = useMemo(()=>Array(20).fill(0).map((v,i)=>({key:i, text:i, value:i})), []);

    const maxAmountToSend = useCallback(()=>{
            return format(Math.max(maxBalanceAmount - maxTransactionFee, C.MIN_AMOUNT));
    },[maxBalanceAmount, maxTransactionFee]);

    const verifyReceiverAddr = useCallback((value)=>{
        const vc = value.toLowerCase().trim();
        if(vc.length !== 66) return false;
        if(vc.includes("k:")===false) return false;
        return [...vc.split(':')[1]].every((v,i)=>"0123456789abcdef".includes(v));
    },[]);

    const transferAllow = useCallback((t)=>{
        let isSenderAddrValid = verifyReceiverAddr(t.senderAccountAddr);
        let isReceiverAddrValid = verifyReceiverAddr(t.receiverAccountAddr);
        let sameAccountSameChainid = t.senderAccountAddr === t.receiverAccountAddr && t.senderChainId === t.receiverChainId;
        return !!(isSenderAddrValid & isReceiverAddrValid & !sameAccountSameChainid);
    }, []);

    const minGasPrice = useMemo(()=>+localStorage.getItem('minGasPrice'),[localStorage.getItem('minGasPrice')]);
    const minGasLimit = useMemo(()=>+localStorage.getItem('minGasLimit'),[localStorage.getItem('minGasLimit')]);
    
    return <CoinSenderWrapper visible={visible}>
            <Wrapper>
                <div className='row-item text-overflow'>
                    <span>
                        <div>Sender Account:</div>
                        <Dropdown placeholder='Sender Account' search selection 
                            options={senderAddrList}
                            value={transferOpt.senderAccountAddr}
                            disabled={true}
                            onChange={(e,d)=>{
                                setTransferOpt(produce((s)=>{
                                    s.senderAccountAddr = d.value;
                                }))
                            }}
                        />
                    </span>
                    <span>
                        <div>Chain Id:</div>
                        <Dropdown placeholder='ChainId' compact selection
                            options={chainIdList}
                            style={{width: '100px'}}
                            value={transferOpt.senderChainId}
                            onChange={(e,d)=>{
                                setTransferOpt(produce((s)=>{
                                    s.senderChainId = d.value;
                                    let chainBalance = accountDetails?.details?.[d.value]?.balance;
                                    let chainBalanceMax = Math.max(chainBalance - maxTransactionFee, C.MIN_AMOUNT);
                                    s.amount = format(Math.min(original(s).amount, chainBalanceMax))
                                }));
                            }}
                        />
                    </span>
                </div>
                <div className='row-item text-overflow'>
                    <span>
                        <div>Receiver Account:</div>
                        <Dropdown placeholder='Receiver Account' search selection 
                            allowAdditions
                            options={receiverAddrList} 
                            value={transferOpt.receiverAccountAddr}
                            title={transferOpt.receiverAccountAddr}
                            onAddItem={(e,{value})=>{
                                const vu = value.trim();
                                if(verifyReceiverAddr(vu)){
                                    setTransferOpt(produce((s)=>{
                                        s.receiverAccountAddr = vu;
                                    }));
                                    setReceiverAddrList(produce((s)=>{
                                        if(!s.some((v,i)=>v.value===vu)){
                                            s.push({text: vu, value: vu, key: s.length + 1});
                                        }
                                    }));
                                    chrome.runtime.sendMessage({
                                        type: C.MSG_UPSERT_A_RECEIVER_ADDR, 
                                        receiverAccountAddr: vu
                                    });
                                }
                            }}
                            onChange={(e,d)=>{
                                setTransferOpt(produce((s)=>{
                                    s.receiverAccountAddr = d.value;
                                }))
                            }}
                        />
                    </span>
                    <span>
                        <div>Chain Id:</div>
                        <Dropdown placeholder='ChainId' compact selection 
                            options={chainIdList}
                            style={{width: '100px'}}
                            value={transferOpt.receiverChainId}
                            onChange={(e,d)=>{
                                setTransferOpt(produce((s)=>{
                                    s.receiverChainId = d.value;
                                }))
                            }}
                        />
                    </span>
                </div>
                <div className='row-item amount'>
                    <span>
                        <div>
                            <span>Amount:</span> 
                            <span className='hint-balance'>(Balance: {maxBalanceAmount} KDA)</span>
                        </div>
                        <Input 
                            className='amount-input-ui'
                            placeholder='Amount' 
                            label={{ 
                                basic: true, 
                                content: <div>
                                    <span onClick={()=>{
                                        setTransferOpt(produce((s)=>{
                                            s.amount = maxAmountToSend();
                                        }));
                                    }}>Max</span>
                                    <span>KDA</span>
                                </div> 
                            }}
                            labelPosition='right'
                            value={transferOpt.amount}
                            type='number'
                            step='1e-6'
                            min='1e-6'
                            max={maxAmountToSend()}
                            onChange={(e,d)=>{
                                setTransferOpt(produce((s)=>{
                                    s.amount = d.value;
                                }))
                            }}
                            onBlur={()=>{
                                setTransferOpt(produce((s)=>{
                                    s.amount = Math.min(original(s).amount, maxAmountToSend());
                                }));
                            }}
                        />
                    </span>
                </div>
                <div className='row-item hidden'>
                    <span>
                        <div>Gas Payers:</div>
                        <div className='row-item group column'>
                            <div className='row-item'>
                                <span>
                                    <div>Gas Paying Account (Chain {transferOpt.senderChainId}):</div>
                                    {/*
                                        <Dropdown placeholder='Account Address' search selection 
                                            options={receiverAddrList} 
                                            value={transferOpt.gasPayingAccountA}
                                            onChange={(e,d)=>{
                                                setTransferOpt(produce((s)=>{
                                                    s.gasPayingAccountA = d.value;
                                                }))
                                            }}
                                        />
                                    */}
                                </span>
                            </div>
                            {
                                isCrossTransfer && <div className='row-item'>
                                    <span>
                                        <div>Gas Paying Account (Chain {transferOpt.receiverChainId}):</div>
                                        {/** 
                                            <Dropdown placeholder='Account Address' search selection 
                                                options={receiverAddrList} 
                                                value={transferOpt.gasPayingAccountB}
                                                onChange={(e,d)=>{
                                                    setTransferOpt(produce((s)=>{
                                                        s.gasPayingAccountB = d.value;
                                                    }))
                                                }}
                                            />
                                        */}
                                    </span>
                                </div>
                            }
                        </div>
                    </span>
                </div>
                <div className='row-item'>
                    <span>
                        <div>Transaction Settings:</div>
                        <div className='row-item group column transaction'>
                            <div className='row-item'>
                                <span>
                                    <div>Transaction Speed:</div>
                                    <Slider
                                        step={10 * minGasPrice}
                                        min={minGasPrice}
                                        max={C.MAX_GAS_PRICE}
                                        value={transferOpt.gasPrice}
                                        onChange={(e,v)=>{ 
                                            setTransferOpt(produce((s)=>{
                                                let o = original(s);
                                                let gp = format(v)
                                                let curMaxAmount = Math.max(maxBalanceAmount - gp * o.gasLimit, C.MIN_AMOUNT);
                                                s.gasPrice = gp;
                                                s.amount = format(Math.min(curMaxAmount, o.amount));
                                            }));
                                        }}
                                        marks={[
                                            { value: 1, label: 'Slow' },
                                            { value: 250, label: '' },
                                            { value: 500, label: 'Normal' },
                                            { value: 750, label: ''},
                                            { value: 1000, label: 'Fast' },
                                        ]}
                                    />
                                </span>
                            </div>
                            <div className='row-item row'>
                                <span style={{flex: 1}}>
                                    <div>Gas Price:</div>
                                    <Input fluid placeholder='Gas Price' 
                                        step={10 * minGasPrice} 
                                        type='number'
                                        min={minGasPrice}
                                        max={C.MAX_GAS_PRICE}
                                        value={transferOpt.gasPrice} 
                                        onChange={(e,d)=>{
                                            setTransferOpt(produce((s)=>{
                                                let o = original(s);
                                                let gp = Number(d.value);
                                                let curMaxAmount = Math.max(maxBalanceAmount - gp * o.gasLimit, C.MIN_AMOUNT);
                                                s.gasPrice = gp;
                                                s.amount = format(Math.min(curMaxAmount, o.amount));
                                            })) 
                                        }}
                                        onBlur={()=>{
                                            setTransferOpt(produce((s)=>{
                                                s.gasPrice = format(Math.max(+transferOpt.gasPrice, minGasPrice));
                                            }))
                                        }}
                                    />
                                </span>
                                <span style={{flex: 1}}>
                                    <div>Gas Limit:</div>
                                    <Input fluid placeholder='Gas Limit' 
                                        type='number' 
                                        step='100'

                                        min={minGasLimit}
                                        value={transferOpt.gasLimit}
                                        onChange={(e,d)=>{
                                            setTransferOpt(produce((s)=>{
                                                let o = original(s);
                                                let gl = Number(d.value);
                                                let curMaxAmount = Math.max(maxBalanceAmount - o.gasPrice * gl, C.MIN_AMOUNT);
                                                s.gasLimit = Math.max(gl, minGasLimit);
                                                s.amount = format(Math.min(curMaxAmount, o.amount));
                                            }))
                                        }}
                                        onBlur={()=>{
                                            setTransferOpt(produce((s)=>{
                                                s.gasLimit = Math.max(+transferOpt.gasLimit, minGasLimit);
                                            }))
                                        }}
                                    />
                                </span>
                            </div>
                            <div className='row-item column fee'>
                                <span>Max Transaction Fee:</span>
                                <span>{maxTransactionFee}</span>
                            </div>
                            <div className='row-item hidden'>
                                <span>
                                    <div>Creation Timestamp:</div>
                                    <Input 
                                        placeholder='' 
                                        defaultValue={Math.floor(Date.now() / 1000)}
                                    />
                                </span>
                            </div>
                            <div className='row-item'>
                                <span>
                                    <div>Request Expires (TTL):</div>
                                    <Slider
                                        value={Number(transferOpt.ttl)}
                                        step={100}
                                        min={100}
                                        max={86400}
                                        //valueLabelDisplay="auto"
                                        marks={[
                                            { value: 60, label: '1Min'},
                                            { value: 28800, label: '8Hours' },
                                            { value: 86400, label: '1Day' },
                                        ]}
                                        onChange={(e,v)=>{
                                            setTransferOpt(produce((s)=>{
                                                s.ttl = v;
                                            }))
                                        }}
                                    />
                                    <div className='row-item'>
                                        <span>
                                            <Input 
                                                value={Number(transferOpt.ttl)}
                                                type="number"
                                                step={100}
                                                min={100}
                                                max={86400}
                                                style={{marginLeft:'0px'}}
                                                onChange={(e,d)=>{
                                                    setTransferOpt(produce((s)=>{
                                                        s.ttl = d.value;
                                                    }))
                                                }}
                                            />
                                        </span>
                                    </div>
                                </span>
                            </div>
                        </div>
                    </span>
                </div>
                <div className='row-item'>
                    <span>
                        <div>Comunication:</div>
                        <Button variant="contained" 
                            color="primary"
                            disabled={!transferAllow(transferOpt)}
                            onClick={(e)=>{ setConfirmOpened(true); }
                        }>Transfer</Button>
                    </span>
                </div>
            </Wrapper>
            <TransferConfirm data={transferOpt} visible={confirmOpened} cancelConfirm={()=>setConfirmOpened(false)}/>
    </CoinSenderWrapper>
}

