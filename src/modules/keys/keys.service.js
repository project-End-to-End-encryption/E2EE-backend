import KeyBundleRepository from "../../repositories/implementations/mongodb/crypto/mongo.keys.repository.js";
import {verifySignature} from "../../shared/utils/crypto.js";
import {CryptoKeyException} from "../../shared/errors/domainErrors.js";


export const registerKeyBundle = async (userId, deviceId, payload) => {
    if (!userId) throw new CryptoKeyException('Missing userId', 'CRYPTO_KEY_REQUIRED');
    const { identityPublicKey, signedPreKey, signedPreKeySignature, oneTimePreKeys } = payload;

    if(!deviceId || !identityPublicKey || !signedPreKey?.keyId || !signedPreKey?.publicKey  || !signedPreKeySignature){
        throw new CryptoKeyException('Invalid key bundle', 'CRYPTO_KEY_REQUIRED')
    }

    const isValid = verifySignature(signedPreKey.publicKey, signedPreKeySignature, identityPublicKey);
    if(!isValid){
        throw new CryptoKeyException('Signature invalid or mismatch', 'INVALID_SIGNATURE');
    }

    return KeyBundleRepository.upsert({
        userId: String(userId),
        deviceId,
        identityPublicKey,
        signedPreKey,
        signedPreKeySignature,
        oneTimePreKeys: Array.isArray(oneTimePreKeys) ? oneTimePreKeys : []
    });
};

export const getPreKeyBundle = async (userId, deviceId) =>{
    const device = await KeyBundleRepository.findDevice(userId, deviceId);
    if(!device) throw new CryptoKeyException('No key bundle for this device', 'DEVICE_NOT_FOUND');

    const oneTimePreKey = await KeyBundleRepository.popOneTimePreKey(userId, deviceId);

    return {
        identityPublicKey: device.identityPublicKey,
        signedPreKey: device.signedPreKey,
        signedPreKeySignature: device.signedPreKeySignature,
        oneTimePreKey: oneTimePreKey ? {keyId: oneTimePreKey.keyId, publicKey: oneTimePreKey.publicKey} : null
    };
};

export const listUserDevice = async (userId) => {
    const device = await KeyBundleRepository.findByUserId(userId);
    return device.map(d => ({userId, deviceId: d.deviceId}));
}

export const countOneTimePreKeys = (userId, deviceId) =>
    KeyBundleRepository.countOneTimePreKeys(userId, deviceId);

export const addOneTimePreKeys = async (userId, deviceId, keys) => {
    if (!Array.isArray(keys) || !keys.length) {
        throw new CryptoKeyException('No prekeys supplied', 'INVALID_PAYLOAD');
    }

    const current = await KeyBundleRepository.countOneTimePreKeys(userId, deviceId);

    if(current + keys.length > 200) {
        throw new CryptoKeyException('Prekey store full', 'PREKEY_LIMIT');
    }
    return KeyBundleRepository.addOneTimePreKeys(userId, deviceId, keys);
}