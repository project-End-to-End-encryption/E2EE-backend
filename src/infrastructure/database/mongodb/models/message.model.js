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
    storageKey: {
        type: String,
        required: true
    },
    byteSize: {
        type: Number,
        required: true
    },
    category: {
        type: String,
        enum: ['image','video', 'audio', 'file'],
        required: true
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
    sendAt: {
        type: Date,
        required: true,
        default: Date.now()
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