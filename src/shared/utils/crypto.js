import nacl from 'tweetnacl'
import naclUtil from 'tweetnacl-util'

export const verifySignature = (message, signature, publicKey) => {
    try{
        return nacl.sign.detached.verify(
            naclUtil.decodeBase64(message),
            naclUtil.decodeBase64(signature),
            naclUtil.decodeBase64(publicKey)
        );
    } catch {
        return false;
    }
}

// it decodes that the message signed by the private key corresponding to this public key, produce by the signature