import React, {useState, useLayoutEffect, useCallback} from "react";
import styled from "styled-components";
import produce from "immer";
import {useRecoilState, useSetRecoilState} from "recoil";
import { vImportPrikeyPageX } from "../atoms.js";
import { Input } from 'semantic-ui-react';
import C from "../../background/constant";
import {getPublicKeyFromSecretKey, isValidKey} from "../../background/utils";
import {RippleButton} from "./special-buttons";

const Wrapper = styled.section`
    position: fixed;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;

    display: flex;
    flex-flow: column nowrap;
    justify-content: center;
    align-items: center;

    transform: scale(0.8);
    opacity: 0;
    pointer-events: none;

    background-color: rgba(0,0,0,0.8);
    box-shadow: 0px 0px 0px 10000px rgba(0,0,0,0.8);
    transition: all 0.24s;

    ${
        p=>p.visible===true && `
            transform: scale(1);
            opacity: 1;
            pointer-events: initial;
        `
    }

    >div{
        position: relative;
        padding: 20px;
        border-radius: 5px;
        border: thin solid rgba(255,255,255,0.5);
        background-color: rgba(0,0,0,0.8);
        width: 266px;
        height: 333.89px;
        display: flex;
        flex-flow: column nowrap;
        justify-content: flex-end;

        &:after{
            content: 'IMPORT YOUR PRIVATE KEY';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-50%,-260%) rotate(0deg) scaleY(1.08);
            font-size: 40px;
            font-weight: 800;
            color: rgba(255,255,255,0.5);
            pointer-events: none;
            text-shadow: 0px 0px 3px rgba(255,255,255,0.66);
            width: 300px;
            line-height: 1.08;
            text-align: center;
        }

        >div{
            position: relative;

            &.title{
                margin-bottom: 2px;
                font-size: 13px;
                color: #eee;
                user-select: none;
            }

            &.publicKey{
                word-break: break-all;
                width: 100%;
                border-radius: 5px;
                background-color: #146356;
                color: #eee;
                padding: 12px 15px;
                margin-bottom: 16px;
                height: 83px;
                text-transform: uppercase;
                text-shadow: 0px 0px 1px rgba(0,0,0,0.8);
                font-size: 12px;
                border: thin solid #eee;
            }

            &.privateKey{
                word-break: break-all;
                
            }
        }
    }
`;

const Button = styled(RippleButton)`
    position: relative;
    width: 100%;
    background-color: #064635 !important;
    color: #F4EEA9;
    border-radius: 5px;
    text-transform: uppercase;
    margin-top: 16px;
    margin-bottom: 8px;
    font-weight: bold;
    border: thin solid #eee;

    &:hover{
        background-color: #519259 !important;
        color: #fff !important;
    }

    &:active{
        color: cyan !important;
    }
`;

export default function(){
    const [importPrikeyPage, setImportPriKeyPage] = useRecoilState(vImportPrikeyPageX);
    const [text, setText] = useState('');
    const [publickey, setPublickey] = useState('');

    const confirmOnClick = useCallback((props) => {
        if(text.length >= 64){
            chrome.runtime.sendMessage({
                type: C.MSG_IMPORT_PRIVATE_KEY,
                privateKey: text
            });
        }
    },[text]);

    useLayoutEffect(()=>{
        if(importPrikeyPage.opened === false){
            setText('');
            setPublickey('');
        }
    }, [importPrikeyPage.opened])

    return <Wrapper 
        visible={importPrikeyPage.opened} 
        onClick={(e)=>{
            e.stopPropagation(); 
            setImportPriKeyPage(produce((s)=>{
                s.opened = false;
            }));
        }}
    >
        <div onClick={(e)=>{e.stopPropagation()}}>
            <div className='title'>Is It Your Public Key?</div>
            <div className='publicKey'>{publickey}</div>
            <div className='title'>Enter Your Private Key:</div>
            <Input className='privateKey'
                fluid icon='key' 
                placeholder='Your Private Key' 
                type='password' 
                value={text}
                max={64}
                onChange={(e,{value})=>{   
                    if(value.length !== 0){
                        let padstr = value.padEnd(64,'f');
                        if(isValidKey(padstr)){ 
                            let pk = getPublicKeyFromSecretKey(padstr)
                            setText(value); 
                            setPublickey(pk);
                        } 
                    }else{
                        setText(''); 
                        setPublickey('');
                    }
                }}
            />
            <Button onClick={confirmOnClick}>Confirm</Button>
        </div>
    </Wrapper>
}