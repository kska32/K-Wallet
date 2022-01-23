import React, {useState, useCallback} from "react";
import styled from "styled-components";
import FilterNoneIcon from '@material-ui/icons/FilterNone';
import IconButton from '@material-ui/core/IconButton';
import DoneOutlineOutlinedIcon from '@material-ui/icons/DoneOutlineOutlined';
import GradeIcon from '@material-ui/icons/Grade';

const $CopiesButton = styled.div`
    position: relative;
    width: 45px;
    height: 45px;
    border-radius: 50%;
    background-color: rgba(0,0,0,0.06);
    display: flex;
    justify-content: center;
    align-items: center;
    overflow: hidden;

    ${p=>p.nobg && `
        background:none !important;
        *{
            background:none !important;
            &:hover{
                background:none !important;
            }
        }
    `}

    ${
        p=>p.minisize && `
            width: 20px;
            height: 20px;
            margin-right: 5px;

            >button.MuiIconButton-root.spbutton{
                >span.MuiIconButton-label{
                    svg{
                        font-size: 13.6px;
                    }
                }
            }
        `
    }


    >button.MuiIconButton-root.spbutton{
        position:relative;
        /* padding: 10px; */

        >span.MuiIconButton-label{
            display: flex;
            flex-flow: column nowrap;
            align-items: center;
            justify-content: center;
            svg{
                color: ${p=>p.color || 'black'};
                
                transition: all 0.18s;
                /* font-size: 10px; */

                &:nth-of-type(1){
                    opacity: 1;
                    transform: scale(1) rotateZ(90deg);
                }
                &:nth-of-type(2){
                    position: absolute;
                    opacity: 0;
                    transform: scale(1.5);
                }

                ${p=>p.copied && `
                    &:nth-of-type(1){
                        opacity: 0;
                        transform: scale(1.5)  rotateZ(90deg);
                    }
                    &:nth-of-type(2){
                        position: absolute;
                        opacity: 1;
                        transform: scale(1);
                    }
                `}
            }
        }
    }
`;

export const CopiesButton = ({text='hello,world', color, nobg, minisize, ...props})=>{
    //copy to clipboard 
    const [copied, setCopied] = useState(false);
    const [tid, setTid] = useState(0);

    const copyToClipboard = useCallback(()=>{
        navigator.clipboard.writeText(text).then(()=>{
            setCopied(true);
            const c = () => setCopied(false);
            clearTimeout(tid);
            setTid(setTimeout(c, 2000));
        });
    }, [text,tid])


    return <$CopiesButton copied={copied} onClick={copyToClipboard} 
                style={props.style} color={color} nobg={nobg} minisize={minisize}
            >
            <IconButton className='spbutton'>
                <FilterNoneIcon />
                <DoneOutlineOutlinedIcon />
            </IconButton>
    </$CopiesButton>
}



//ripple buttons


const RippleButtonStyle = styled.button`
    position: relative;
    width: 90%;
    height: 36px;
    background-color: #eee;
    border-radius: 18px;

    background-color: #3b5998;
    color: #fff;
    font-size: 13px;

    display:flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 10px;

    outline: none;
    border: none;
    cursor: pointer;
    transition: all 0.18s;
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 0px;

    &:hover{
        background-color: #304d8a;
    }

    &:active{
        color: red;
    }

    >div{
        position: relative;
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        user-select: none;
    }

    @keyframes ripple {
        to {
            transform: scale(60) rotate(360deg);
            opacity: 0;
          }
    }

    >.ripple{
        position: absolute; 
        animation: ripple 600ms linear;
        color: rgba(255, 255, 255, 0.5);
        width: 5px;
        height: 5px;
        pointer-events: none;
        z-index: 3;
    }

`;

export const RippleButton = ({children, onClick, ...props})=>{
    const [ripples,setRipple] = useState([]);
    const [x, setX] = useState(null);
    const [y, setY] = useState(null);

    const onRootClick = useCallback((x,y)=>{
        if(x!==null && y!==null){
            setRipple(<GradeIcon 
                className='ripple' 
                key={Date.now()} 
                style={{left:x, top:y, transform: `scale(0) rotate(${Math.round(Math.random()*720)}deg)`}}
            />);
        }
    },[]);

    const onMouseMove = useCallback((e)=>{
        setX(e.nativeEvent.offsetX);
        setY(e.nativeEvent.offsetY);
    },[])

    return <RippleButtonStyle onClick={()=>onRootClick(x,y)} onMouseMove={onMouseMove} {...props}>
        <div onClick={(e)=>{ onClick(e); }}>
            {children}
        </div>
        {ripples}
    </RippleButtonStyle>
}

