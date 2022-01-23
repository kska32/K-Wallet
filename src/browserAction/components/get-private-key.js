import React, {useState, useEffect, useLayoutEffect, useCallback, useMemo} from "react";
import styled from "styled-components";
import produce from "immer";
import { Input } from 'semantic-ui-react';
import {useRecoilState, useSetRecoilState, useRecoilValue} from "recoil";
import C from "../../background/constant";
import { vPrivateKeyPageX } from "../atoms.js";

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

        &:after{
            content: 'GET - PRIVATE - KEY';
            position: absolute;
            left: 50%;
            top: 50%;
            transform: translate(-80%,-50%) rotate(-90deg) scaleY(1.2);
            font-size: 50px;
            font-weight: 800;
            color: rgba(255,255,255,0.5);
            pointer-events: none;
            white-space: nowrap;
            text-shadow: 0px 0px 3px rgba(255,255,255,0.8);
        }

        >div.title{
            margin-bottom: 2px;
            font-size: 13px;
            color: #eee;
            user-select: none;
        }

        >input{
            text-align: center;
        }

        >div.result-ok{
            margin-top: 12px;
            position: relative;
            width: 100%;
            min-height: 100px;
            border-radius: 5px;
            background-color: rgba(255,255,255,0.8);
            pointer-events: none;
            padding: 10px;
            color: gray;

            transition: all 0.24s;
            opacity: 0;
            pointer-events: none;

            &.visible{
                opacity: 1;
                pointer-events: initial;
            }
            
            >div{
                border-radius: 5px;
                position: relative;
                color: #000;
                font-size: 13px;

                &.pubkeyTitle{
                    margin-bottom: 0px;
                    font-size: 10px;
                    margin-left: 3px;
                }
                &.pubkeyContent{
                    min-height: 60px;
                    background-color: rgba(255,255,255,1);
                    margin-bottom: 8px;
                    word-break: break-all;
                    max-width: 207px;
                    padding: 8px;
                }
                &.prikeyTitle{
                    margin-bottom: 0px;
                    font-size: 10px;
                    margin-left: 3px;
                }
                &.prikeyContent{
                    min-height: 60px;
                    background-color: rgba(255,255,255,1);
                    word-break: break-all;
                    max-width: 207px;
                    padding: 8px;

                    &:after{
                        content: '';
                        width: 100px;
                        height: 50px;
                        background-color: rgba(255,255,255,1);
                        position: absolute;
                        left: 50%;
                        top: 50%;
                        transform: translate(-50%,-50%);
                        pointer-events: none;
                        border: 6px dashed black;
                    }
                }
            }
        }

        >div.result-failed{
            position: absolute;
            left: 50%;
            top: 60%;
            transform: translate(-50%, -50%);
            color: white;
            display: flex;
            justify-content: center;
            align-items: center;
            font-size: 16px;
            font-weight: bold;
            text-transform: uppercase;
            color: #eee;
            border: thin solid #eee;
            text-align: center;
            padding: 12px 20px;
            user-select: none;

            transition: all 0.24s;
            pointer-events: none;
            opacity: 0;

            &.visible{
                opacity: 1;
                pointer-events: initial;
                animation: show 800ms ease both infinite alternate ; 
            }

            @keyframes show{
                to {
                    opacity: 0;
                }
            }
        }
    }
`;

export default function(){
    const [privateKeyPage, setPrivateKeyPage] = useRecoilState(vPrivateKeyPageX);
    const [result, setResult] = useState({});
    const [text, setText] = useState('');

    useLayoutEffect(()=>{
        if(privateKeyPage.opened === false){
            setResult({});
            setText('');
        }
    }, [privateKeyPage.opened])

    const getPrivateKey = useCallback((value)=>{
        chrome.runtime.sendMessage({
            type: C.MSG_GET_PRIVATE_KEY,
            password: value
        }, (res)=>{
            setResult(res);
        });
    },[]);
    
    return <Wrapper 
        visible={privateKeyPage.opened} 
        onClick={(e)=>{
            e.stopPropagation(); 
            setPrivateKeyPage(produce((s)=>{
                s.opened = false;
            }))
        }}
    >
        <div onClick={(e)=>{e.stopPropagation(); }}>
            <div className='title'>Enter Your Password:</div>
            <Input icon='key' placeholder='Your Password' type='password' fluid
                value={text}
                onChange={(e,{value})=>{ setText(value); getPrivateKey(value) }}
            />
            <div className={'result-ok' + (result?.success === true ? ' visible' : '')}>
                <div className='pubkeyTitle'>Public Key:</div>
                <div className='pubkeyContent'>{result?.value?.[0]??''}</div>
                <div className='prikeyTitle'>Private Key:</div>
                <div className='prikeyContent'>{result?.value?.[1]??''}</div>
            </div>
            <div className={'result-failed' + ((result?.success === false && String(text).length !== 0) ? ' visible' : '')}>
                Incorrect Password
            </div>
        </div>
    </Wrapper>
}