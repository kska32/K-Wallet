
export function pushNoti(txid, param){
    const amount = param.amount;
    const sender = param.senderAccountAddr.slice(0,8).toUpperCase();
    const receiver = param.receiverAccountAddr.slice(0,8).toUpperCase();
    const {senderChainId, receiverChainId} = param;

    let args = [
        txid, 
        {
            type: 'basic',
            iconUrl: '../icons/k128.png',
            title: 'Transfer Successful',
            message: `${sender}.C${senderChainId} ⇨ ${receiver}.C${receiverChainId}\nKDA: ${amount}`,
            priority: 2,
            eventTime: Date.now(),
            contextMessage: 'K: Wallet'
        }, 
        (id)=>{
            //
        }
    ];

    chrome.notifications.create(...args);


    /*
    chrome.notifications.onClicked.addListener((reqkey)=>{
        const exploreLink = (reqKey,networkId)=>{
            const networkName = networkId.indexOf("mainnet") > -1 ? 'mainnet' : 'testnet';
            return  `https://explorer.chainweb.com/${networkName}/tx/${reqKey}`;
        };

        window.open(exploreLink(reqkey, param.networkId), "_blank");
    })
    */
}



