
const C = {
    MAX_GAS_PRICE: 1e-5,
    MIN_GAS_PRICE: 1e-9,

    MAX_GAS_LIMIT: 1e5,
    MIN_GAS_LIMIT: 400,

    MAX_X_GAS_PRICE: {
        testnet: 1e-9,
        mainnet: 1e-8 
    },
    MIN_X_GAS_PRICE: {
        testnet: 1e-12,
        mainnet: 1e-11 
    },

    MAX_X_GAS_LIMIT: {
        testnet: 400,
        mainnet: 400
    },
    MIN_X_GAS_LIMIT: {
        testnet: 100,
        mainnet: 100 
    },

    MIN_AMOUNT: 1e-6,

    LISTEN_MAX_DELAY: 1000 * 60 * 3,
    LISTEN_EACH_DELAY: 1000 * 5,

    MSG_GET_STATE: "GET_STATE",
    MSG_SET_STATE: "SET_STATE",

    MSG_SAVE_PASS: "SAVE_PASS",
    MSG_VERIFY_PASSWORD: "VERIFY_PASSWORD",
    MSG_HAS_ACCOUNT: "HAS_ACCOUNT", //#
    MSG_LOCK_UP: "LOCK_UP",
    MSG_GET_ACCOUNT_DETAILS: "GET_ACCOUNT_DETAILS",
    MSG_JUST_TRANSFER: "JUST_TRANSFER",
    MSG_GET_RECENT_REQKEYS_DATA: "GET_RECENT_REQKEYS_DATA",
    MSG_GET_SENDER_ADDR_LIST: "GET_SENDER_ADDR_LIST",
    MSG_GET_RECEIVER_ADDR_LIST: "GET_RECEIVER_ADDR_LIST",
    MSG_UPSERT_A_RECEIVER_ADDR: "UPSERT_A_RECEIVER_ADDR",
    MSG_CREATE_NEW_TAB: "CREATE_NEW_TAB",
    MSG_GENERATE_RANDOM_KEYPAIR: "GENERATE_RANDOM_KEYPAIR",

    MSG_CHANGE_SELECTED_ACCOUNT: "CHANGE_DEFAULT_ACCOUNT",
    MSG_REMOVE_ACCOUNT: "REMOVE_ACCOUNT",
    MSG_GET_PRIVATE_KEY: "GET_PRIVATE_KEY",
    MSG_VERIFY_PRIVATE_KEY: 'VERIFY_PRIVATE_KEY',
    MSG_IMPORT_PRIVATE_KEY: 'IMPORT_PRIVATE_KEY',
    MSG_CREATE_KEYPAIR_LIST: 'CREATE_KEYPAIR_LIST',
    MSG_INIT_ACCOUNT: 'INIT_ACCOUNT',
    MSG_VALIDATE_CURRENT_PASSWORD: 'VALIDATE_CURRENT_PASSWORD',
    MSG_CHANGE_PASSWORD: 'CHANGE_PASSWORD',
    MSG_GET_NETWORKID: 'GET_DEFAULT_NETWORKID',
    MSG_SET_NETWORKID: 'SET_NETWORKID',
    MSG_GET_IDLE_LIMIT: 'GET_IDLE_LIMIT',
    MSG_SET_IDLE_LIMIT: 'SET_IDLE_LIMIT',
    MSG_REMOVE_A_TX_RESULT: 'REMOVE_A_TX_RESULT',

    FMSG_TRANSFER_PROGRESS: "TRANSFER_PROGRESS",
    FMSG_ACCOUNT_DETAILS_REFRESH: "ACCOUNT_DETAILS_REFRESH",
    FMSG_UPDATE_KEYPAIR_LIST: "UPDATE_KEYPAIR_LIST",
    FMSG_REFRESH_RECEIVER_ADDRS: "REFRESH_RECEIVER_ADDRS",
    FMSG_RECEIVER_ADDR_LIST_UPDATED: "RECEIVER_ADDR_LIST_UPDATED",
    FMSG_VERIFY_PASSWORD_SUCCESS: "VERIFY_PASSWORD_SUCCESS",
    FMSG_SAVE_PASS_SUCCESS: "SAVE_PASS_SUCCESS",
    FMSG_GENERATE_RANDOM_KEYPAIR: "GENERATE_RANDOM_KEYPAIR_SUCCESS",
    FMSG_CHANGE_SELECTED_ACCOUNT_SUCCESS: "CHANGE_SELECTED_ACCOUNT_SUCCESS",
    FMSG_REMOVE_ACCOUNT_SUCCESS: "REMOVE_ACCOUNT_SUCCESS",
    FMSG_IMPORT_ACCOUNT_SUCCESS: "IMPORT_ACCOUNT_SUCCESS",
    FMSG_LOCK_UP_SUCCESS: "LOCK_UP_SUCCESS",
    FMSG_LOCK_PROGRESS_STATE: "LOCK_PROGRESS_STATE",
    FMSG_INIT_ACCOUNT_SUCCESS: "INIT_ACCOUNT_SUCCESS",
};

export const BackgroundState = {
        networkId: 'mainnet01', 
        idleLimit: 60 * 15,
        pageNum: 0,

        password: '',
        passwordConfirm: '',

        mnemonic01: [], 
        mnemonic02: [], 
        mnemonic03: [],

        passwordR: '',
        passwordConfirmR: '',
        mnemonicR: [],
        keypairHex: {
            publicKey: '',
            secretKey: ''
        },
        keypairBuf: {
            publicKey: '',
            secretKey: ''
        },
        keypairList: [],//[keypairHex,keypairHex={},..]
        accountDetails: {
            details: [],
            sum: 0,
            nullChainIds: [],
            accountAddr: '',
            error: null,
            networkId: null
        },
        isLoading: {
            opened: false,
            text: null
        },
        kdausdt: 0,
        confirmOpened: false,
        globalErrorData: {
            //modal
            opened: false,
            message: ''
        },
        errorData: {
            //modal
            opened: false,
            message: null,
            xtransfer: null,
            details: null
        },
        infoData: {
            //modal
            opened: false,
            details: null,
            reqkey: null
        },
        confirmData: {
            //modal
            opened: false,
            message: null,
            confirmed: null
        },
        deleteData: {
            //modal
            opened: false,
            publicKey: '',
            privateKey: '',
            success: null,
        },
        switchAccountBoxOpened: false,
        transferOpt: {
            senderAccountAddr: '',
            senderChainId: 0,
            receiverAccountAddr: '',
            receiverChainId: 0,
            amount: 0.1,
            gasPayingAccountA: '',
            gasPayingAccountB: '',
            gasPrice: 0.00000001,
            gasLimit: 600,
            xGasPrice: undefined,
            xGasLimit: undefined,
            ttl: 28800
        },
        senderAddrList: [], //[{text: 'k:'+v.key, value: 'k:'+v.key, key: i+1},..]
        receiverAddrList: [],
        Pending: {
            [C.MSG_GET_ACCOUNT_DETAILS]: false
        },
        sidebar: {
            opened: false
        },
        privateKeyPage: {
            opened: false
        },
        importPriKeyPage: {
            opened: false
        },
        changePasswordPage: {
            opened: false
        }
    }


export default Object.freeze(C);

