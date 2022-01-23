import React from "react";
import ReactDOM from 'react-dom';
import 'semantic-ui-css/semantic.min.css';
import './components/variable.scss';

const contentScriptID = 'kadena-wallet';

document.body.style=`
    margin: 0;
    padding: 0;
    background-color: white;
    display: flex;
    flex-flow: row wrap;
    width: 100%;
`

let theapps = document.querySelectorAll(`#${contentScriptID}`);
    theapps.forEach((theapp)=>theapp.remove());

let ContentScriptEl = document.createElement("div");
    ContentScriptEl.setAttribute('id',contentScriptID);
    ContentScriptEl.style = `
        position: relative;
        width: 100%;
        height: 100%;
        left: 0px;
        top: 0px;
        overflow: hidden;
    `;
    document.querySelector("body").appendChild(ContentScriptEl);

ReactDOM.render(<div>Hello Kadena!</div>, ContentScriptEl);
