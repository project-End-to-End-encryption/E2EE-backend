import {BadRequestException} from "../../shared/errors/domainErrors.js";

const MAX_FIELD_BYTES = 4096;

const tooBig = (value) => typeof value === 'string' && Buffer.byteLength(value, 'utf-8') > MAX_FIELD_BYTES;

export const validateVaultPayload = (req,res,next) => {
    const {kdf, verifier, encryptedIdentityKey, encryptedMasterBackupKey } = req.body || {};

    if (!kdf || !verifier || !encryptedIdentityKey || !encryptedMasterBackupKey){
        return next(new BadRequestException(
            'kdf, verifier, encryptedIdentityKey and encryptedMasterBackupKey are all required'
        ));
    }

    const candidates = [
        kdf.salt,
        verifier,
        encryptedIdentityKey.iv,
        encryptedIdentityKey.ciphertext,
        encryptedMasterBackupKey.iv,
        encryptedMasterBackupKey.ciphertext
    ];

    if(candidates.some(tooBig)){
        return next(new BadRequestException('Recovery payload field exceeds maximum size'))
    }
    next();
}