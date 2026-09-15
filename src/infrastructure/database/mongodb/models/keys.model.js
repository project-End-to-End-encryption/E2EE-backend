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

keyBundleSchema.index({userId: 1, deviceId: 1}, {unique: true});

const KeyBundleModel =  mongoose.model('KeyBundle', keyBundleSchema);

export {KeyBundleModel}