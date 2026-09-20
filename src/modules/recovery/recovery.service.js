import RecoveryRepository from "../../repositories/implementations/mongodb/auth/mongo.recovery.repository.js";
import ConversationKeyRepository from '../../repositories/implementations/mongodb/conversation/mongo.conversationKey.repository.js'
import ConversationStateRepository from '../../repositories/implementations/mongodb/conversation/mongo.conversationState.repository.js'
import PendingEnvelopeRepository from '../../repositories/implementations/mongodb/messaging/mongo.pendingEnvelope.repository.js'
import {RecoveryException, NotFoundException} from "../../shared/errors/domainErrors.js";
/**
 * RECOVERY VAULT SERVICE
 * The server's entire job here is: store an opaque blob, hand it back and refuse to overwrite it by accident
 * It performs NO cryptography
 *
 * What the server can see: salt, KDF parameters, a one-way verifier, ciphertext.
 *
 * Shape validation is strict on purpose:  A malformed blob is not a 500 - it is a client bug
 */

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;

const isSealedBox = (box) =>
    !!box &&
    typeof box.iv === 'string' && box.iv.length > 0 && BASE64.test(box.iv) &&
    typeof box.ciphertext === 'string' && box.ciphertext.length > 0 && BASE64.test(box.ciphertext);

const assertValidBlob = (payload) => {
    const {kdf, verifier, encryptedIdentityKey, encryptedMasterBackupKey } = payload || {};

    if(!kdf || typeof kdf.salt !== 'string' || !BASE64.test(kdf.salt)){
        throw new RecoveryException('Missing or malformed KDF salt', 'INVALID_BLOB');
    }

    const iterations = Number(kdf.iterations);
    if(!Number.isInteger(iterations) || iterations < 100000){
        throw new RecoveryException('KDF iteration count is too low', 'WEAK_KDF');
    }

    if(typeof verifier !== 'string' || !BASE64.test(verifier)){
        throw new RecoveryException('Missing verifier', 'INVALID_BLOB');
    }

    if(!isSealedBox(encryptedIdentityKey)){
        throw new RecoveryException('Malformed encrypted identity key', 'INVALID_BLOB')
    }

    if(!isSealedBox(encryptedMasterBackupKey)){
        throw new RecoveryException('Malformed encrypted master backup key', 'INVALID_BLOB')
    }
};

const toStoredBlob = (userId, payload) => ({
    userId: String(userId),
    version: Number(payload.version) || 1,
    kdf: {
        algorithm: payload.kdf.algorithm || 'PBKDF2',
        hash: payload.kdf.hash || 'SHA-256',
        iterations: Number(payload.kdf.iterations),
        salt: payload.kdf.salt
    },
    verifier: payload.verifier,
    encryptedIdentityKey: {
        iv: payload.encryptedIdentityKey.iv,
        ciphertext: payload.encryptedIdentityKey.ciphertext
    },
    encryptedMasterBackupKey: {
        iv: payload.encryptedMasterBackupKey.iv,
        ciphertext: payload.encryptedMasterBackupKey.ciphertext
    }
});

/**
 * Called once, right after signup, from the device that generated the identity key.
 */

export const getVaultStatus = async (userId) => {
    if (!userId) throw new RecoveryException('Missing UserId', 'UNAUTHENTICATED', 401);

    const blob = await RecoveryRepository.findByUserId(userId);
    return { exists: !!blob, generation: blob?.generation ?? null };
};

export const enrollVault = async (userId, payload) => {
    if (!userId) throw new RecoveryException('Missing UserId', 'UNAUTHENTICATED', 401);
    assertValidBlob(payload);

    const created = await RecoveryRepository.createIfAbsent(toStoredBlob(userId, payload));

    if(!created){
        throw new RecoveryException(
            'A recovery vault already exists for this account',
            'VAULT_EXISTS',
            409
        );
    }

    return {generation: created.generation, createdAt: created.createdAt};
};

/**
 * The login flow: the new device pulls the blob, then asks the user for
 * the recovery key and decrypts everything locally.
 */

export const getVault = async (userId) => {
    if(!userId) throw new RecoveryException('Missing UserId', 'UNAUTHENTICATED', 401);

    const blob = await RecoveryRepository.findByUserId(userId);
    if(!blob) throw new NotFoundException('No recovery vault for this account');

    return{
        version: blob.version,
        generation: blob.generation,
        kdf: blob.kdf,
        verifier: blob.verifier,
        encryptedIdentityKey: blob.encryptedIdentityKey,
        encryptedMasterBackupKey: blob.encryptedMasterBackupKey,
        createdAt: blob.createdAt,
        lastRestoredAt: blob.lastRestoredAt
    };
};

/** Fire-and-forget telemetry for a "last restored on ..." screen. */
export const markRestored = async (userId) => {
    await RecoveryRepository.touchRestored(userId);
}

/**
 * Re-wrap the SAME identity key and the SAME MBK under a NEW recovery key.
 *
 * if the user want to change the recovery key -> the user still has the old one,
 * the client decrypts locally, re-encrypts with the new one,
 * and uploads. History survives completely, because the MBK inside never changed.
 */

export const rotateRecoveryKey = async (userId, payload) => {
    if(!userId) throw new RecoveryException('Missing UserId', 'UNAUTHENTICATED', 401);

    assertValidBlob(payload);

    const existing = await RecoveryRepository.findByUserId(userId);
    if (!existing) throw new NotFoundException('No recovery vault to rotate');

    const updated = await RecoveryRepository.replace(userId, toStoredBlob(userId, payload));
    return { generation: updated.generation };
}

/**
 * THE DESTRUCTIVE PATH - "I lost my recovery key".
 *
 * if user lost its keys then there will be no chat history present
 *
 * What is destroyed:
 *  - the old vault (old identity key and old MBK are gone for good)
 *  - every ConversationKey row for this user -> every archive ciphertext they
 *    were able to read is now permanently opaque TO THEM
 *  - their queued transport envelopes, which are encrypted to a ratchet state
 *    that no longer exists on any device
 *  - their read cursors
 *
 *  The identity key changes, so peers will see a safety-number change.
 *
 *  frontend work:
 *  - generate a fresh identity keypair + prekeys and re-register the bundle
 *  - enroll a brand-new vault with a brand new MBK
 *  - wipe local IndexedDB ratchet sessions are dead - peers will re-handshake
 */

export const resetVault = async (userId) => {
    if(!userId) throw new RecoveryException('Missing UserId', 'UNAUTHENTICATED', 401);

    await RecoveryRepository.deleteByUserId(userId);

    const [keys] = await Promise.all([
        ConversationKeyRepository.deleteAllForUser(userId),
        PendingEnvelopeRepository.deleteAllForUser(userId),
        ConversationStateRepository.deleteAllForUser(userId)
    ]);

    return{
        archiveKeysDestroyed: keys?.deletedCount ?? 0,
        message: 'Vault reset. All previous chat history is now permanently unreadable.'
    }
}
