/**
 * Recover Blob
 * it contain two keys:
 * -> encryptedIdentityKey: contains the user identity key
 * -> encryptedMasterBackupKey: this will decrypt the chat history
 */
import mongoose from "mongoose";

const sealedBoxSchema = new mongoose.Schema({
    iv: {
        type: String,
        required: true
    },
    ciphertext:{
        type: String,
        required: true
    }
},{_id:false});

const recoveryBlobSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    version: {
        type: Number,
        required: true,
        default: 1
    },
    kdf: {
        algorithm: {
            type: String,
            required: true,
            default: 'PBKDF2'
        },
        hash: {
            type: String,
            required: true,
            default: 'SHA-256'
        },
        iterations: {
            type: Number,
            required: true,
            default: 210000
        },
        salt: {
            type: String,
            required: true
        }
    },
    verifier: {
        type: String,
        required: true
    },
    encryptedIdentityKey: {
        type: sealedBoxSchema,
        required: true
    },
    encryptedMasterBackupKey: {
        type: sealedBoxSchema,
        required: true
    },
    generation: {
        type: Number,
        required: true,
        default: 1
    },
    lastRestoreAt: {
        type: Date,
        default: null
    }
}, {timestamps: true});

export const RecoveryBlobModel = mongoose.model('RecoveryBlop', recoveryBlobSchema);