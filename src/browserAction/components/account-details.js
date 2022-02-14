import React, {useState, useCallback} from "react";
import styled from "styled-components";
import {VisibleStyleComp} from "./styled.comp.js";
import {CopiesButton} from "./special-buttons";

const AccountDetailsWrapper = styled(VisibleStyleComp)`
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;
    display: flex;
    overflow: auto;

    box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.2);

    &::-webkit-scrollbar {
        width: 0px;
    }

    >div{
        position: relative;
        display: table;
        box-sizing: border-box;
        background-color: #fff;
        flex: 1;

        >div{
            display: table-row;

            &:nth-of-type(even){
                background-color: rgba(0,0,0,0.036);
            }
            
            &:nth-of-type(1){
                position: sticky;
                top: 0px;
                background-color: #009688;
                z-index: 1;
                color: #eee;
                box-shadow: 0px 1px 3px 2px rgba(0,0,0,0.23);
                user-select: none;

                >span{
                    padding: 0px 5px;
                    display: table-cell;
                    text-align: center !important;
                    cursor: default !important;
                }

                &:hover{
                    background-color: #009688 !important;
                }
            }
            
            &:hover{
                background-color: rgba(0,0,0,0.1);
            }


            >span{
                position: relative;
                font-size: 13px;
                font-weight: bold;
                padding: 0px 5px;
                display: table-cell;
                text-align: center;
                margin: auto;
                border-right: 1px solid white;
                height: 22px;
                line-height: 22px;

                &:nth-of-type(1){
                    >svg{
                        position: absolute;
                        font-size: 12px;
                        cursor: pointer;
                        left: 15px;
                        top: 50%;
                        transform: translateY(-50%) rotateZ(90deg);

                        &:hover{
                            color: orange;
                        }
                        &:active{
                            color: red;
                        }
                    }
                }
                &:nth-of-type(2){

                }
                &:nth-of-type(3){
                    cursor: pointer;
                }
                &:nth-of-type(4){
                }
            }

        }
    }
`;

const NoData = styled.div`
    position: absolute;
    width: 100%;
    height: calc(100% - 22px);
    background-color: white !important;
    display: flex !important;
    justify-content: center;
    align-items: center;
    flex-flow: column wrap;
    
    font-size: 20px;
    white-space: nowrap;
    margin-top: -30px;
    color: rgba(0,0,0,0.36);
    font-weight: bold;
    transition: all 0.18s;

    &:hover{
        background-color: white !important;
    }
`;


export default function AccountDetails({details=[], accountAddr='', visible}){
    const [sym] = useState('-');

    const amOwner = useCallback((v)=>{
        return (v?.guard?.keys??[]).includes(accountAddr.split(":")[1]) 
    },[accountAddr]);

    const detailsItemEx = useCallback((ix,data)=>{
        let result = {
            ['chain']: null,
            ['keyset']: {
                ['keys']: [], 
                ['pred']: ''
            },
            ['account']: ''
        }

        result.chain = ix;
        result.keyset = data.guard;
        result.account = data.account;

        return JSON.stringify(result);
    }, []);

    return <AccountDetailsWrapper visible={visible}>
        <div>
            <div>
                <span>Chain.No</span>
                <span>Owner</span>
                <span>Predicate</span>
                <span>Balance</span>
            </div>
            {
                details.map((v,i)=>{
                    return <div key={i}>
                        <span>{amOwner(v) && <CopiesButton style={{position:'absolute',top:'2px', left:'10px'}} nobg minisize text={detailsItemEx(i,v)}/> }{String(i).padStart(2,'0')}</span>
                        <span>{amOwner(v) ? '✓' : sym}</span>
                        <span title={JSON.stringify(v?.guard?.keys)}>{v?.guard?.keys?.length}{v?.guard?.keys?.length>0 ? ',' : ''}{v?.guard?.pred??sym}</span>
                        <span>{v?.balance > -1 ? v.balance : 'TIMEOUT'}</span>
                    </div>
                })
            }
            {
                details.length === 0 && <NoData>No Data</NoData>
            }
        </div>
    </AccountDetailsWrapper>
}