import KeyBundleRepository from "../../repositories/implementations/mongodb/mongo.keys.repository.js";
import {verifySignature} from "../../shared/utils/crypto.js";
import {CryptoKeyException} from "../../shared/errors/domainErrors.js";


export const registerKeyBundle = async (userId, payload) => {
    const { identityPublicKey, signedPreKey, signedPreKeySignature, oneTimePreKeys } = payload;

    if(!identityPublicKey || !signedPreKey?.keyId || !signedPreKey?.publicKey  || !signedPreKeySignature){
        throw new CryptoKeyException('Invalid key bundle', 'CRYPTO_KEY_REQUIRED')
    }

    const isValid = verifySignature(signedPreKey.publicKey, signedPreKeySignature, identityPublicKey);
    if(!isValid){
        throw new CryptoKeyException('Signature invalid or mismatch', 'INVALID_SIGNATURE');
    }

    return KeyBundleRepository.upsert({
        userId,
        identityPublicKey,
        signedPreKey,
        signedPreKeySignature,
        oneTimePreKeys: Array.isArray(oneTimePreKeys) ? oneTimePreKeys : []
    });
};