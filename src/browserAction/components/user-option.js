import React, {useState, useCallback, useLayoutEffect} from "react";
import styled from "styled-components";
import {VisibleStyleComp} from "./styled.comp.js";
import kadenaLogo from "../../icons/k-colen-logo.svg"
import produce from 'immer';

import GitHubIcon from '@material-ui/icons/GitHub';
import TwitterIcon from '@material-ui/icons/Twitter';
import RedditIcon from '@material-ui/icons/Reddit';
import EmailIcon from '@material-ui/icons/Email';
import RateReviewIcon from '@material-ui/icons/RateReview';
import ThumbUpIcon from '@material-ui/icons/ThumbUp';

const Wrapper = styled(VisibleStyleComp)`
    position: absolute;
    width: 100%;
    height: 100%;
    left: 0px;
    top: 0px;
    background-color: #fff;
   
    box-sizing: border-box;
    display: flex;
    flex-flow: column nowrap;
    align-items: center;
    justify-content: center;

    *{
        position: relative;
        display: flex;
        font-size: 10px;
        line-height: 1rem;
        word-break: break-all;
        text-transform: capitalize;
    }

    >div{
        flex-flow: column nowrap;
        align-items: center;
        justify-content: space-around;
        width: 80%;
        height: 80%;

        >div.logo{
            width: 180px;
            height: 180px;
            background: transparent url(${kadenaLogo}) no-repeat center;
            background-size: 100%;
            opacity: 1;
            margin-bottom: 30px;
            display: flex;
            flex-flow: column nowrap;
        }
        >div.author{
            flex-flow: column nowrap;
            width: 180px;
            color: gray;
            align-items: flex-end;

            >div{
                width: 100%;
                margin-bottom: 8px;
                margin-left: 5px;
                justify-content: flex-end;
                text-transform: lowercase;
                text-align: right;

                &:nth-of-type(1){
                    margin-bottom: 3px;
                    text-transform: initial;
                }
                &:nth-of-type(2){
                    text-transform: capitalize;
                }
                &:nth-of-type(3){

                }

                &:nth-of-type(4){
                    text-transform: capitalize;
                }
                &:nth-of-type(5){
                    text-transform: capitalize;
                    svg{
                        font-size: 28px;
                        background-color: white;
                        border-radius: 50%;
                        padding: 5px;
                        cursor: pointer;
                        box-shadow: 0px 0px 3px 2px rgba(0,0,0,0.12);
                        margin: 5px;
                    }

                    a{
                        color: gray;
                    }
                }
            }
        }
    }
`


export default function UserOption({visible, ...props}){

    return <Wrapper visible={visible}>
        <div>
            <div className='logo'></div>
            <div className='author'>
                <div> K:Wallet - V1.0.0</div>
                <div>By Sparrow</div>
                <div>k:b8559cae02d291fbff2425511b040aaae606bd8e5edf6a2c16fe7529f6ab77f2</div>
                <div>
                    I am a big fan of kadena,<br/>
                    Hope many people like this wallet Ext.
                </div>
                <div>
                    <a href="https://github.com/kska32" target='_blank'><GitHubIcon/></a>
                    <a href="https://twitter.com/kska329" target='_blank'><TwitterIcon/></a>
                    <a href="mailto:kska32@gmail.com" target='_blank'><EmailIcon/></a>
                    <a href="https://chrome.google.com/webstore/detail/bfjdmoniilmnfleebdfpcchhjbmdffil" target='_blank'><ThumbUpIcon/></a>
                </div>
            </div>
        </div>
    </Wrapper>
}