/**
 * Message  (the ARCHIVE record)
 */
import mongoose from "mongoose";

const sealedPayloadSchema = new mongoose.Schema({
    v:{
        type: Number,
        required: true,
        default: 1
    },
    epoch: {
        type: Number,
        required: true,
        default: 1
    },
    iv: {
        type: String,
        required: true
    },
    ciphertext: {
        type: String,
        required: true
    }
}, {_id: false});

const attachmentSchema = new mongoose.Schema({
    // Client-generated id. Lets the encrypted body reference a specific
    // attachment without the server knowing what any of them contain.
    attachmentId: {
        type: String,
        required: true
    },
    storageKey: {
        type: String,
        required: true
    },
    // Size of the CIPHERTEXT object in the bucket, not of the plaintext file.
    byteSize: {
        type: Number,
        required: true
    },
    // Coarse bucket only - enough to render a placeholder before the media is
    // decrypted. The precise mime type lives inside the encrypted body.
    category: {
        type: String,
        enum: ['image','video', 'audio', 'file'],
        required: true
    },
    // Optional encrypted thumbnail object (same encryption scheme, same key).
    thumbnailKey: {
        type: String,
        default: null
    },
    thumbnailByteSize: {
        type: Number,
        default: null
    },
    // SHA-256 of the ciphertext, base64. Integrity of the bytes at rest; it
    // says nothing about the plaintext.
    sha256: {
        type: String,
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {_id: false});

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    senderId: {
        type: String,
        required: true
    },
    senderDeviceId: {
        type: String,
        required: true
    },
    seq: {
        type: Number,
        required: true
    },
    clientMessageId: {
        type: String,
        required: true
    },
    contentType: {
        type: String,
        required: true,
        enum: ['text', 'image', 'video', 'audio', 'file', 'system', 'call'],
        default: 'text'
    },
    payload: {
        type: sealedPayloadSchema,
        required: true
    },
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    sentAt: {
        type: Date,
        required: true,
        default: Date.now
    },
    deletedFor: {
        type: [String],
        default: []
    },
    isRevoked: {
        type: Boolean,
        default: false
    },
    editedAt: {
        type: Date,
        default: null
    }
}, {timestamps:true});

// History pagination: a page of history, newest first
messageSchema.index({conversationId:1, seq: -1});

// Idempotency: This is what stops reconnect storms from duplicating messages.
messageSchema.index({conversationId: 1, clientMessageId: 1}, {unique:true});
// Created-time queries
messageSchema.index({conversationId: 1, createdAt: 1});

export const MessageModel = mongoose.model('Message', messageSchema);