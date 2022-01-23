import React,{useState, useCallback, useLayoutEffect, useMemo} from "react";
import styled from "styled-components";
import {useRecoilState} from "recoil";
import {vStateX, vChangePasswordPageX} from "../atoms.js";
import C from "../../background/constant";
import produce from 'immer';
import {passwordValidate} from './component-utils.js';
import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';

import VisibilitySharpIcon from '@material-ui/icons/VisibilitySharp';
import VisibilityOffSharpIcon from '@material-ui/icons/VisibilityOffSharp';


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

    background-color: rgba(0,0,0,0.6);
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
        padding: 20px 30px;
        border-radius: 5px;
        border: thin solid rgba(255,255,255,0.6);
        background-color: rgba(0,0,0,0.8);
        width: 80%;
        min-height: 60%;
        display: flex;
        flex-flow: column nowrap;
        justify-content: space-around;

        &:after{
            content: 'CHANGE-PASSWORD';
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

        *{
            position: relative;
            display: flex;
            flex-flow: column nowrap;
        }

        >div{
            &.passwordGroup{
                >div{
                    >div{
                        &.input-title{
                            color: rgba(255,255,255,0.6);
                            font-size: 12px;
                            user-select: none;
                        }
                        &.input-box{
                            margin-bottom: 5px;
                            >input{
                                outline: none;
                                border: none;
                                border-radius: 5px;
                                padding: 6px 8px;
                                font-size: 13px;
                                height: 32.7px;
                                font-weight: bold;
                                user-select: none !important;
                            }


                        }
                    }
                    &.cur-pass{ }   
                    &.new-pass{ 
                       input{
                            padding-right: 36px !important;
                       }

                        .eye{
                            position: absolute;
                            right: 3px;
                            height: 30px;
                            width: 30px;
                            justify-content: center;
                            align-items: center;
                            bottom: 6px;
                            border-radius: 50%;
                            cursor: pointer;

                            >svg{
                                position: absolute;
                                left: 50%;
                                top: 50%;
                                transform: translate(-50%, -50%);
                                color: #000;
                                pointer-events: none;
                            }
                        }
                    }
                }
            }

            &.validAlerts{
                padding-left: 16px;
                margin-bottom: 10px;
                margin-top: 10px;

                >div{
                    flex-direction: row;
                    align-items: center;
                    color: rgba(255,255,255,0.3);
                    user-select: none;
                    
                    >svg{
                        font-size: 15px;
                        margin-right: 3px;
                    }

                    >span{
                        font-size: 12px;
                    }

                    &.yes{
                        color: rgba(255,255,255,0.8);
                    }

                    &.no{

                    }
                }
            }

            &.confirmButton{
                >button{
                    border-radius: 5px;
                    outline: none;
                    border: none;
                    height: 32px;
                    margin-top: 10px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: rgba(255,255,255,0.8);
                    font-weight: bold;
                    text-transform: uppercase;
                    cursor: pointer;
                    font-size: 13px;
                    user-select: none;
                    transition: all 0.5s;

                    &:not(:disabled){
                        background-color: #24A19C;
                        color: #eee;

                        &:hover{
                            background-color: #4FBDBA;
                        }


                    }
                }
            }
        }
    }
`;


export default function ChangePassword({visible, ...props}){
    const [changePasswordPage, setChangePasswordPage] = useRecoilState(vChangePasswordPageX);
    const [{passwordR, passwordConfirmR}, savePassword] = useRecoilState(vStateX);
    const [pass1, setPass1] = useState(passwordR||'');
    const [pass2, setPass2] = useState(passwordConfirmR||'');
    const [pass2Visible, setPass2Visible] = useState(false);

    const [validateRes, setValidateRes] = useState({
        min: false,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        same: false
    });

    useLayoutEffect(()=>{
        savePassword(produce((s)=>{
            s.passwordR = pass1;
            s.passwordConfirmR = pass2;
        }));
        let res = passwordValidate().validate(pass2, { details: true });
        let o = res.reduce((a,v,i)=>({...a, [v['validation']]:true}), {});
        setValidateRes(produce((s)=>{
            s.min = !o.min;
            s.lowercase = !o.lowercase;
            s.uppercase = !o.uppercase;
            s.digits = !o.digits;
            s.symbols = !o.symbols;
        }));
    },[pass1, pass2]);

    const isok = useMemo(()=>Object.values(validateRes).reduce((a,c)=>a&c,1), [validateRes]);

    useLayoutEffect(()=>{
        if(pass1.length >= 8){
            chrome.runtime.sendMessage({
                type: C.MSG_VALIDATE_CURRENT_PASSWORD, 
                currentPassword: pass1
            },(res)=>{
                setValidateRes(produce((s)=>{
                    s.same = res.matched === true;
                }));
            })
        }else{
            setValidateRes(produce((s)=>{
                s.same = false;
            }));
        }
    }, [pass1]);

    const ConfirmOnClick = useCallback((pass1, pass2)=>{
        chrome.runtime.sendMessage({
            type: C.MSG_CHANGE_PASSWORD,
            currentPassword: pass1,
            newPassword: pass2
        })
    },[isok]);

    return <Wrapper visible={changePasswordPage.opened}
        onClick={(e)=>{
            e.stopPropagation(); 
            setChangePasswordPage(produce((s)=>{
                s.opened = false;
            }));
        }}
    >
        <div onClick={(e)=>{e.stopPropagation()}}>
            <div className='passwordGroup'>
                <div className='cur-pass'>
                    <div className='input-title'>Current Password:</div>
                    <div className='input-box'>
                        <input type='password' defaultValue={passwordR} onChange={e=>setPass1(e.target.value)}/>
                    </div>
                </div>
                <div className='new-pass'>
                    <div className='input-title'>New Password:</div>
                    <div className='input-box'>
                        <input type={pass2Visible ? 'text' : 'password'} 
                            defaultValue={passwordConfirmR} 
                            onChange={e=>setPass2(e.target.value)}
                        />
                    </div>
                    <span className='eye' onClick={()=>setPass2Visible(s=>!s)}>
                        {!pass2Visible && <VisibilityOffSharpIcon />}
                        {pass2Visible && <VisibilitySharpIcon />}
                    </span>
                </div>
            </div>
            <div className='validAlerts'>
                <div className={validateRes.same ? 'yes' : 'no'}>
                    {validateRes.same ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon /> }
                    <span>Current Password Matched.</span>
                </div>
                <div className={validateRes.min ? 'yes' : 'no'}>
                    {validateRes.min ? <CheckCircleOutlineIcon/> : <ErrorOutlineIcon /> }
                    <span>Eight characters minimum.</span>
                </div>
                <div className={validateRes.uppercase ? 'yes' : 'no'}>
                    {validateRes.uppercase ? <CheckCircleOutlineIcon/> : <ErrorOutlineIcon /> }
                    <span>One uppercase character at least.</span>
                </div>
                <div className={validateRes.lowercase ? 'yes' : 'no'}>
                    {validateRes.lowercase  ? <CheckCircleOutlineIcon/> : <ErrorOutlineIcon /> }
                    <span>One lowercase character at least.</span>
                </div>
                <div className={validateRes.digits ? 'yes' : 'no'}>
                    {validateRes.digits  ? <CheckCircleOutlineIcon/> : <ErrorOutlineIcon /> }
                    <span>One number at least.</span>
                </div>
                <div className={validateRes.symbols ? 'yes' : 'no'}>
                    {validateRes.symbols ? <CheckCircleOutlineIcon/> : <ErrorOutlineIcon /> }
                    <span>One special character at least.</span>
                </div>
            </div>
            <div className='confirmButton'>
                <button disabled={!isok} onClick={()=>ConfirmOnClick(pass1,pass2)}>Confirm</button>
            </div>
        </div>
    </Wrapper>
}