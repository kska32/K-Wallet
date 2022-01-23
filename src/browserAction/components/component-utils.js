import passwordValidator from "password-validator";
import * as bip39 from "bip39";
import pact from "pact-lang-api";
import nacl from "tweetnacl";


export function passwordValidate(){
    let schema = new passwordValidator();

    schema
        .is().min(8, "Eight characters minimum.")                         
        .has().uppercase(1, "One uppercase character at least.")                 
        .has().lowercase(1, "One lowercase character at least.")  
        .has().digits(1,"One number at least.")    
        .has().symbols(1, "One special character at least.")

    return schema;
}


export function createMnemonic(){
    return {
        generateMnemonic: () => {
            return bip39.generateMnemonic();
        },
        validateMnemonic: (mnemonic) => {
            return bip39.validateMnemonic(mnemonic);
        },
        mnemonicToKeypair: (mnemonic) => {
            const hex = (h)=>pact.crypto.binToHex(h);
            const seed64 = bip39.mnemonicToSeedSync(mnemonic);
            const seed32 = Buffer.concat([
                seed64.slice(0,8), 
                seed64.slice(16,24), 
                seed64.slice(32,40), 
                seed64.slice(48,56)
            ]);
            const naclKeyPairs = nacl.sign.keyPair.fromSeed(seed32);
            const keyPair = {
                publicKey: naclKeyPairs.secretKey.slice(32,64),
                secretKey: naclKeyPairs.secretKey.slice(0,32)
            }
            return {
                buf: keyPair,
                hex: ({
                    publicKey: hex(keyPair.publicKey),
                    secretKey: hex(keyPair.secretKey)
                })
            }
        }
    }
}

export const format = (n) => Number((n).toFixed(9).replace(/0*$/,''));