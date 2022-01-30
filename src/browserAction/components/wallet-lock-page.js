import React, {useState, useCallback, useLayoutEffect} from "react";
import styled from "styled-components";
import C from "../../background/constant";
import Button from '@material-ui/core/Button';
import { makeStyles } from '@material-ui/core/styles';
import LockOpenIcon from '@material-ui/icons/LockOpen';
import kadenaLogo from "../../icons/k-colen-logo.svg"
import TextField from '@material-ui/core/TextField';
import {useSetRecoilState} from "recoil";
import {vIsLoadingX} from "../atoms";
import produce from "immer";


const Wrapper = styled.div`
    position: absolute;
    left: 0px;
    top: 0px;
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    align-items: center;
    background-color: #fff;
    justify-content: space-around;

    opacity: 0;
    pointer-events: none;
    transition: all 0.24s;

    ${
        p=>p.visible && `
            pointer-events: initial;
            opacity: 1;

        `
    }
`;

const KadenaLogoBox = styled.div`
    position: relative;
    width: 186px;
    height: 186px;

    background-color: white;
    border-radius: 50%;
    box-sizing: border-box;

    display:flex;
    justify-content: center;
    align-items: center;
   
    &:before{
        content: '';
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
    width: 56%;
    button{
        &:nth-of-type(1){
            margin-top: 12px;
        }
    }

    .error{
        position: absolute;
        left: 6px;
        top: 44px;
        color: transparent;
        font-size: 10px;
        margin-left: 14px;
        font-weight: 500;
        select-user: none;
        transition: all 0.18s;
        user-select: none;

        &.incorrect{
            color: rgba(0, 0, 0, 0.54);
            left: 0px;
        }
    }

    >div{
        .MuiOutlinedInput-notchedOutline {
            border-color: black !important;
        }
        >.MuiFormControl-root{
            *{
                color: rgba(0, 0, 0, 0.54); !important;
                >input{
                    color: #000;
                }
            }
        }
    }
`;


const useStyles = makeStyles((theme) => ({
    button: {
      'backgroundColor': '#000',
      '&:hover': {
        backgroundColor: '#333',
      }
    },
    textField: {
        'backgroundColor': '#fff',
        'width': '100%',
        'borderRadius': '5px'
    },
}));

export default function({visible}){
    const classes = useStyles();
    const [pass, setPass] = useState('');
    const [isIncorrect, setIncorrect] = useState(false);
    const setLoading = useSetRecoilState(vIsLoadingX);

    const verifyPassword = useCallback(async(password)=>{
        setLoading(produce((s)=>{ s.opened = true;}));
        chrome.runtime.sendMessage({ 
            type: C.MSG_VERIFY_PASSWORD, 
            value: {password} 
        }, (res)=>{
            if(chrome.runtime.lastError){
                //console.error('lock-page:', chrome.runtime.lastError.message);
            } 
            setLoading(produce((s)=>{ s.opened = false;}));
            if(res?.success === false){
                setIncorrect(true);
            }
        });
    }, []);

    useLayoutEffect(()=>{
        if(visible !== true) setPass('');
    },[visible])

    return <Wrapper visible={visible}>
        <KadenaLogoBox />
        <ButtonGroup>
            <div>
                <TextField
                    label="Enter Password"
                    className={classes.textField}
                    margin="dense"
                    variant="outlined"
                    size="medium"
                    type="password"
                    value={pass}
                    onChange={(e)=>{
                        setPass(e.target.value);
                        setIncorrect(false); 
                    }}
                    onKeyUp={e=>{if(e.keyCode===13) verifyPassword(pass);}}
                    color={isIncorrect ? 'secondary' : 'primary'}
                />
                <div className={'error' + (isIncorrect ? ' incorrect' : '')}>Incorrect Password.</div>
            </div>
            <Button variant="contained" size="large" color="secondary" 
                startIcon={<LockOpenIcon fontSize="small"/>}
                className={classes.button}
                onClick={()=>verifyPassword(pass)}
            >
                Unlock
            </Button>
        </ButtonGroup>
    </Wrapper>
}