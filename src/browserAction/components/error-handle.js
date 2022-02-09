import React, {useMemo} from "react";
import styled from "styled-components";
import {produce} from "immer";
import {useSetRecoilState} from 'recoil';
import {vErrorDataX} from '../atoms';
import Button from '@material-ui/core/Button';
import C from "../../background/constant";


const Wrapper = styled.div`
    position: fixed;
    width: 100%;
    height: 100%;
    background-color: rgba(0,0,0,0.8);
    left: 0px;
    top: 0px;
    z-index: 150;
    color: #eee;

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
            font-size: 13px;
            user-select: text;

            &::-webkit-scrollbar {
                width: 0px;
            }

            &.reqkey{
                display: inline-flex;
                flex-flow: row wrap;
                word-break: break-all;
                width: 100%;
                background-color: rgba(0,0,0,0.3);
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0px 0px 0px 1px rgba(255,255,255,0.1);

                &:before{
                    content: 'Request-Key:';
                    position: relative;
                    display: inline-flex;
                    flex-flow: row wrap;
                    color: gray;
                }
            }

            &.error-board{
                width: 100%;
                height: 200px;
                border-radius: 8px;
                background-color: rgba(0,0,0,0.3);
                margin-bottom: 20px;
                word-break: break-all;
                padding: 15px;
                overflow-y: auto;
                margin-top: 12px;
                box-shadow: 0px 0px 0px 1px rgba(255,255,255,0.1);
            }
            
            &.confirm{
                
            }

            &.cancel{
                margin-top: 12px;
            }

        }

    }
`;

export default function({errorData, visible}){
    const setErrorData = useSetRecoilState(vErrorDataX);

    const hidden = useMemo(()=>{
        const cc =[
            "Insufficient funds",
            "resumePact: pact completed"
        ]
        return !cc.some(v=>(errorData?.message??'').includes(v));
    },[errorData.message]);

    return <Wrapper visible={visible}>
        <div>
            <div className='reqkey'>
                {errorData?.details?.reqKey??''}
            </div>
            <div className='error-board'>
                {errorData?.message??''}
            </div>
            {
                hidden && <div className='confirm'>
                    <Button variant="contained" color="primary" onClick={()=>{ 
                        setErrorData(produce((s)=>{
                            s.opened = false;
                            s.message = null;
                            s.xtransfer = null;
                            s.details = null;
                        }));
                        chrome.runtime.sendMessage({
                            type: C.MSG_CONTINUE_ERROR_TRANSFER,
                            reqkey: errorData.details.reqKey
                        });
                    }}>Continue</Button>
                </div>
            }
            <div className='cancel'>
                <Button variant="contained" color={hidden ? "secondary" : "primary"} onClick={()=>{ 
                    setErrorData(produce((s)=>{
                        s.opened = false;
                    }));
                }}>{ hidden ? 'Cancel' : 'Close' }</Button>
            </div>
        </div>
    </Wrapper>
}
