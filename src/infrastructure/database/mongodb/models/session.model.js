import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },

    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },

    hashedRefreshToken: {
        type: String,
        required: true
    },

    device: {
        browser: {
            type: String,
            required: true
        },

        browserVersion: {
            type: String
        },

        os: {
            type: String,
            required: true
        },

        osVersion: {
            type: String
        },

        deviceType: {
            type: String,
            enum: ['desktop', 'mobile', 'tablet', 'unknown'],
            default: 'unknown'
        }
    },

    activeTabId: {
        type: String,
        default: null
    },

    isActive: {
        type: Boolean,
        required: true,
        default: true,
        index: true
    },

    lastActive: {
        type: Date,
        required: true,
        default: Date.now
    },

    expiresAt: {
        type: Date,
        required: true,
    },

    revokedAt: {
        type: Date,
        default: null
    },

},{timestamps: true});

sessionSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const Session = mongoose.model('Session',sessionSchema);

export {Session};