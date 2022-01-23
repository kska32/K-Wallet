
export function pushNoti(txid, amount, receiver){
    let args = [
        txid, 
        {
            type: 'basic',
            iconUrl: '../icons/k128.png',
            title: 'Transfer Successful',
            message: `You Have Successfully Sent\n${amount}Kda To ${receiver}.`,
            priority: 2,
            eventTime: Date.now(),
            contextMessage: 'k: wallet'
        }, 
        (id)=>{
            //
        }
    ];

    chrome.notifications.create(...args);
}



