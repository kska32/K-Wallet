import React,{useCallback} from "react";
import produce from "immer";
import {useSetRecoilState} from 'recoil';
import styled from "styled-components";
import {vStateX} from "../atoms.js";
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import AccountBalanceWalletIcon from '@material-ui/icons/AccountBalanceWallet';
import StarsIcon from '@material-ui/icons/Stars';
import kadenaLogo from "../../icons/k-colen-logo.svg";


const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    align-items: center;
    background-color: #fff;
`;


const KadenaLogoBox = styled.div`
    position: relative;
    width: 180px;
    height: 180px;

    background-color: white;
    border-radius: 50%;
    box-sizing: border-box;

    display:flex;
    justify-content: center;
    align-items: center;
    margin-top: 80px;
    
    &:before{
        content: '';
        font-size: 138px;
        color: black;
        font-weight: bold;

        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        filter: drop-shadow(5px 5px 3px rgba(0, 0, 0, .5));
        background: transparent url(${kadenaLogo}) no-repeat center;
        background-size: 100%;
        width: 100%;
        height: 100%;
    }

    &:after{
        content: '';
        font-size: 88px;
        color: rgba(0,0,0,0.12);
        font-weight: bold;
        pointer-events: none;

        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
    }

`;


const ButtonGroup = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    margin-top: 150px;
    width: 56%;
    button{
        &:nth-of-type(1){
            margin-bottom: 18px;
        }
    }
    
`;


const useStyles = makeStyles((theme) => ({
    button: {
      'borderRadius': '20px',
      'backgroundColor': '#000',
      '&:hover': {
        backgroundColor: '#333',
      }
    },
}));

export default function(props){
    const setVstate = useSetRecoilState(vStateX);
    const classes = useStyles();

    const onCreateWallet = useCallback(()=>{
        setVstate(produce((s)=>{
            s.pageNum = 1;
        }));
    },[]);

    const onImportWallet = useCallback(()=>{
        setVstate(produce((s)=>{
            s.pageNum = 6;
        }));
    },[])

    return <Wrapper>
        <KadenaLogoBox />
        <ButtonGroup>
            <Button variant="contained" size="large" color="secondary" 
                startIcon={<AccountBalanceWalletIcon />}
                className={classes.button}
                onClick={onCreateWallet}
            >
                Create Wallet
            </Button>
            <Button variant="contained" size="large" color="secondary" 
                startIcon={<StarsIcon />}
                className={classes.button}
                onClick={onImportWallet}
            >
                Import Wallet
            </Button>
        </ButtonGroup>
    </Wrapper>
}