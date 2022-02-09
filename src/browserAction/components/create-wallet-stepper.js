import React,{useState,useCallback,useLayoutEffect} from "react";
import produce from 'immer';
import styled from "styled-components";
import C from "../../background/constant";

import {vStateX, vPasswordConfirmX} from "../atoms.js";
import {useRecoilValue, useRecoilState} from 'recoil';

import { makeStyles } from '@material-ui/core/styles';
import TextField from '@material-ui/core/TextField';
import Button from '@material-ui/core/Button';

import LooksOneIcon from '@material-ui/icons/LooksOne';
import LooksTwoIcon from '@material-ui/icons/LooksTwo';
import Looks3Icon from '@material-ui/icons/Looks3';

import ArrowBackIcon from '@material-ui/icons/ArrowBack';
import ArrowForwardIcon from '@material-ui/icons/ArrowForward';

import FilterNoneIcon from '@material-ui/icons/FilterNone';
import LibraryAddCheckIcon from '@material-ui/icons/LibraryAddCheck';

import ErrorOutlineIcon from '@material-ui/icons/ErrorOutline';
import CheckCircleOutlineIcon from '@material-ui/icons/CheckCircleOutline';
import {passwordValidate, createMnemonic} from './component-utils.js';


const blue = '#000';
const gray = 'lightgray';

const Wrapper = styled.div`
    position: relative;
    width: 100%;
    height: 100%;

    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    align-items: center;
`;

const StepperWrapper = styled.div`
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    padding: 0 50px;
    margin: 52px 0px 50px;

    >div{
        flex: 1;
        text-align: center;
        padding: 5px 0px;
        position: relative;

        &:nth-of-type(even){
            &:after{
                content: '';
                width: 100%;
                height: 2px;
                background-color: ${gray};

                position: absolute;
                left: 0px;
                top: 50%;
                transform: translateY(-50%);
                text-align: center;
            }
        }
        
        &:nth-of-type(odd){
            &:after{
                content: attr(data-desc);
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                font-weight: bold;
                color: ${gray};
            }
        }


        &:nth-of-type(1){
            &:after{
                ${p=>p.step>=1 && `color: ${blue};`}
            }
        }

        &:nth-of-type(2){
            &:after{
                ${p=>p.step>=2 && `background-color: ${blue}`};
            }
        }

        &:nth-of-type(3){
            &:after{
                ${p=>p.step>=2 && `color: ${blue};`}
            }
        }

        &:nth-of-type(4){
            &:after{
                ${p=>p.step>=3 && `background-color: ${blue}`};
            }
        }

        &:nth-of-type(5){
            &:after{
                ${p=>p.step>=3 && `color: ${blue};`}
            }
        }
    }
`;

function Stepper({step}){
    return <StepperWrapper step={step}>  
        <div data-desc="Set Password">
            <LooksOneIcon fontSize="large" style={{color:(step>=1 ? blue : gray)}}/>
        </div>
        <div />
        <div data-desc="Generate Mnemonic">
            <LooksTwoIcon fontSize="large" style={{color:(step>=2 ? blue : gray)}}/>
        </div>
        <div />
        <div data-desc="Verify Mnemonic">
            <Looks3Icon fontSize="large" style={{color:(step>=3 ? blue : gray)}}/>
        </div>
    </StepperWrapper>
}

//

const StepperBodyWrapper = styled.div`
    position: relative;
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    text-align: center;
    
    flex: 1;

    >div{
        &:nth-of-type(1){
            /* title;  Set password: */
            font-size: 14px;
            color: gray;
            margin: 20px auto 10px;
        }

        &:nth-of-type(2){
            /* text-input-group */
            margin-bottom: 10px;

            >div{
                &:nth-of-type(1){
                    margin-bottom: 4px;
                }
                &:nth-of-type(2){

                }
            }
        }

        &:nth-of-type(3){
            width: 260px;
            display: flex;
            flex-flow: column nowrap;
            align-items: flex-start;
            user-select: none;

            >div{
                display: flex;
                flex-flow: row nowrap;
                align-items: center;
                padding-left: 36px;

                >svg{
                    color: lightgray;
                    font-size: 14px;
                }

                >span{
                    margin-left: 3px;
                    color: lightgray;
                    font-size: 12px;
                }

                &.yes{
                    >svg,>span{
                        color: black;
                        text-shadow: 0px 0px 3px rgba(0,0,0,0.24);
                    }
                }

            }
        }

        &#copybt{
            position: absolute;
            bottom: 0px;
            display: flex;
            flex-flow: row nowrap;
            align-items: center !important;
            justify-content: center !important;
            cursor: pointer;

            >span{
                &:nth-of-type(1){
                    margin-left: 4px;
                    margin-top: -2px;
                    user-select: none;
                    position: relative;
                    top: -3px;
                }
            }
            >svg{
                font-size: 16px;

            }
        }
    }
`;

const useStyles = makeStyles((theme) => ({
    buttonNext: {
        'borderRadius': '19.5px',
        'width': '280px',
        'marginBottom': '10px',
        'backgroundColor': '#000',
        '&:hover': {
            'backgroundColor': '#333'
        }
    },

    buttonBack: {
        'borderRadius': '19.5px',
        'width': '280px'
    },

    textField: {
        'backgroundColor': '#fff',
        'width': '260px',
        'borderRadius': '5px'
    },

    MnemonicTextField: {
        'position': 'relative',
        'width': '86px',
        'backgroundColor': 'transparent'
    },
    MnemonicTextFieldX: {
        'backgroundColor': 'white',
        'borderRadius': '5px',
        'position': 'relative',
        'width': '86px',
    }
}));


function StepperBody01({setValid}){
    const classes = useStyles();
    const [{password},savePassword] = useRecoilState(vStateX);
    const [{passwordConfirm}, savePasswordConfirm] = useRecoilState(vStateX);
    const [pass1, setPass1] = useState(password||'');
    const [pass2, setPass2] = useState(passwordConfirm||'');

    const [validateRes, setValidateRes] = useState({
        min: false,
        lowercase: false,
        uppercase: false,
        digits: false,
        symbols: false,
        same: false
    });

    useLayoutEffect(()=>{
        savePasswordConfirm(produce((s)=>{
            s.passwordConfirm = pass2;
        }))

        savePassword(produce((s)=>{
            s.password = pass1;
        }))

        let res = passwordValidate().validate(pass1, { details: true });
        let o = res.reduce((a,v,i)=>({...a, [v['validation']]:true}), {});
     
        setValidateRes({
            min: !o.min,
            lowercase: !o.lowercase,
            uppercase: !o.uppercase,
            digits: !o.digits,
            symbols: !o.symbols,
            same: pass1 === pass2
        });

        setValid(produce((s)=>{
            s[1] = res.length===0 && pass1 === pass2;
        }));
        
    },[pass1, pass2]);

    return <StepperBodyWrapper>
        <div>1. Set Password</div>
        <div>
            <TextField
                label="Enter Password"
                id="outlined-margin-dense"
                defaultValue={password}
                className={classes.textField}
                //helperText="Some important text"
                margin="dense"
                variant="outlined"
                size="medium"
                type="password"
                onChange={e=>setPass1(e.target.value)}
            />
            <TextField
                label="Confirm Password"
                id="outlined-margin-dense"
                defaultValue={passwordConfirm}
                className={classes.textField}
                //helperText="Some important text"
                margin="dense"
                variant="outlined"
                size="medium"
                type="password"
                onChange={e=>setPass2(e.target.value)}
            />
        </div>
        <div>
            <div className={validateRes.same ? 'yes' : 'no'}>
                {validateRes.same ? <CheckCircleOutlineIcon /> : <ErrorOutlineIcon /> }
                <span>Two passwords must be match.</span>
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
    </StepperBodyWrapper>
}


const TextFieldGroup = styled.div`
    position: relative;
    display: flex;
    flex-flow: row wrap;
    justify-content: center;
    align-items: center;
    padding: 0px 36px;

    >div{
        margin-right: 10px;
        margin-bottom: 0px !important;

        &:nth-of-type(3n){
            margin-right: 0px;
        }
    }
`;



function StepperBody02({setValid}){
    const classes = useStyles();
    const [{mnemonic01,mnemonic02}, setMnemonicSeries] = useRecoilState(vStateX);

    const [copied,setCopied] = useState(mnemonic02.length === 12);

    useLayoutEffect(()=>{
        if(mnemonic01.length===0){
            setMnemonicSeries(produce((s)=>{
                let mnem = createMnemonic().generateMnemonic();
                let mnemArr = mnem.trim().split(/\s/gi);
                s.mnemonic01 = [...mnemArr];
            }));
        }
    }, [mnemonic01]);


    const copyToClipboard = useCallback(()=>{
        navigator.clipboard.writeText(mnemonic01.join(' ')).then(()=>{
            setCopied(true);
            setMnemonicSeries(produce((s)=>{
                s.mnemonic02 = [...mnemonic01];
            }));
        }, function() {
            setCopied(false);
        });
    },[mnemonic01]);

    useLayoutEffect(()=>{
        setValid(produce((s)=>{
            s[2] = copied;
        }))
    },[copied])

    return <StepperBodyWrapper>
        <div>2. Generate Mnemonic</div>
        <TextFieldGroup>
            {new Array(12).fill(0).map((v,i)=>{
                return <TextField
                    key={i}
                    label= {String(i+1).padStart(2,'0')}
                    value={mnemonic01[i]}
                    className={classes.MnemonicTextField}
                    //helperText="Some important text"
                    margin="dense"
                    variant="outlined"
                    size="small"
                    type="text"
                    onFocus={(e)=>{ e.target.type='text'}}
                    onBlur={(e)=>{ e.target.type='password'}}
                    disabled
                />
            })}
        </TextFieldGroup>
        <div id='copybt' onClick={copyToClipboard} style={{display:'block'}}>
            {copied ? <LibraryAddCheckIcon /> : <FilterNoneIcon /> }
            <span>Copy To Clipboard</span>
        </div>
    </StepperBodyWrapper>
}


function StepperBody03({setValid}){
    const classes = useStyles();
    const [{mnemonic02, mnemonic03}, setMnemonicSeries] = useRecoilState(vStateX);

    useLayoutEffect(()=>{
        let a = JSON.stringify(mnemonic02);
        let b = JSON.stringify(mnemonic03);

        setValid(produce((s)=>{
            let c = (a === b && mnemonic03.length === 12);
            s[3] = c;
            if(c) s['mnemonic'] = mnemonic03.join(' ');
        }));

    }, [mnemonic02,mnemonic03]);


    return <StepperBodyWrapper>
        <div>3. Verify Mnemonic</div>
        <TextFieldGroup>
            {new Array(12).fill(0).map((v,i)=>{
                return <TextField
                    key={i}
                    label= {String(i+1).padStart(2,'0')}
                    id="outlined-margin-dense"
                    defaultValue={mnemonic03[i]}
                    className={classes.MnemonicTextFieldX}
                    //helperText="Some important text"
                    margin="dense"
                    variant="outlined"
                    size="small"
                    type="password"
                    onFocus={(e)=>{ e.target.type='text'}}
                    onBlur={(e)=>{ e.target.type='password'}}
                    onChange={(e)=>{ 
                        setMnemonicSeries(produce((s)=>{
                            s.mnemonic03[i] = e.target.value?.trim();
                        }))
                    }}
                />
            })}
        </TextFieldGroup>
    </StepperBodyWrapper>
}


const StepperFootWrapper = styled.div`
    position: relative;
    display: flex;
    flex-direction: column;
    margin: 20px auto 60px;
`;

function StepperFoot({step, valid, back, next}){
    const classes = useStyles();
    
    return <StepperFootWrapper>
        <Button variant="contained" size="large" color="primary" 
            endIcon={<ArrowForwardIcon />}
            className={classes.buttonNext}
            onClick={()=>next(step===3)}
            disabled={!valid[step]}
        >
            Next
        </Button>
        <Button variant="contained" size="large" 
            startIcon={<ArrowBackIcon />}
            className={classes.buttonBack}
            //disabled={step===1}
            onClick={back}
        >
            Back
        </Button>
    </StepperFootWrapper>
}

const StepperBodyGroup = styled.div`
    position: relative;
    display: flex;
    width: 100%;
    flex-flow: row nowrap;

    >div{
        width: 100%;
        min-width: 100%;
        transition: transform 0.3s ease, visibility 0.1s 0.1s;

        ${(p)=>{
            switch(p.step){
                case 1:
                    return `
                        transform: translateX(0%);
                        &:nth-of-type(2), &:nth-of-type(3){
                            visibility: hidden;
                        }
                    `;
                case 2:
                    return `
                        transform: translateX(-100%);
                        &:nth-of-type(1), &:nth-of-type(3){
                            visibility: hidden;
                        }
                    `;
                case 3:
                    return `
                        transform: translateX(-200%);
                        &:nth-of-type(1), &:nth-of-type(2){
                            visibility: hidden;
                        }
                    `;
            }
           
        }}
        
    }

`;



export default function(props){
    const [{pageNum: step}, setStep] = useRecoilState(vStateX || 1);
    
    const [valid, setValid] = useState({
        1: false,
        2: false,
        3: false,
        ['mnemonic']: null
    });

    const passwordConfirm = useRecoilValue(vPasswordConfirmX);

    const onBack = useCallback(()=>{
        setStep(produce((s)=>{
            s.pageNum = s.pageNum > 0 ? s.pageNum - 1 : 1;
        }));
    }, []);

    const onNext = useCallback(async (ok)=>{
        if(ok){
            let keypair = createMnemonic().mnemonicToKeypair(valid.mnemonic);
            chrome.runtime.sendMessage({
                type: C.MSG_SAVE_PASS,
                keypairHex: keypair.hex,
                password: passwordConfirm
            });
        }else{
            setStep(produce((s)=>{
                s.pageNum = s.pageNum + 1;
            }));
        }
    },[valid.mnemonic, passwordConfirm])

    return <Wrapper>
        <Stepper step={step}/>
            <StepperBodyGroup step={step}>
                <StepperBody01 setValid={setValid} />
                <StepperBody02 setValid={setValid} />
                <StepperBody03 setValid={setValid} />
            </StepperBodyGroup >
        <StepperFoot step={step} valid={valid} back={onBack} next={onNext}/>
    </Wrapper>
}