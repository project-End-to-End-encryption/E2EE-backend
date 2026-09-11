import mongoose from "mongoose";
const oneTimePreKeySchema = new mongoose.Schema({
    keyId: {
        type: Number,
        required: true,
    },
    publicKey: {
        type: String,
        required: true,
    }
},{_id: false});

const keyBundleSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true,
        index: true
    },
    deviceId: {
      type: String,
      required: true
    },
    identityPublicKey: {
        type: String,
        required: true
    },
    signedPreKey: {
        keyId: {
            type: Number,
            required: true
        },
        publicKey: {
            type: String,
            required: true
        }
    },
    signedPreKeySignature: {
        type: String,
        required: true
    },
    oneTimePreKeys: {
        type: [oneTimePreKeySchema],
        default: []
    }
}, {timestamps: true});

const KeyBundleModel =  mongoose.model('KeyBundle', keyBundleSchema);

export {KeyBundleModel}