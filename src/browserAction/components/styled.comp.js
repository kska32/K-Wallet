import styled from "styled-components";


export const VisibleStyleComp = styled.div`
    transition: all 0.18s;
    opacity: 0;
    transform: scale(0.9);
    pointer-events: none;

    ${
        (p) => {
            if(p.visible === true){
                return `
                    opacity: 1;
                    pointer-events: initial;
                    transform: scale(1);
                    z-index: 300;
                `;
            }
        }
    }

`;