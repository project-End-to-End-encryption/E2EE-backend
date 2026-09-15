/**
 * Conversation
 * one collection for both 1:1 and group chats
 *
 */

import mongoose from "mongoose";

const memberSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member'],
        default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now()
    },
    joinedAtSeq: {
        type: Number,
        default: 0
    }
}, {_id: false});

const conversationSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['direct', 'group']
    },
    name: {
        type: String,
        trim: true,
        default: null
    },
    avatarKey: {
        type: String,
        default: null
    },
    createdBy: {
        type: String,
        required: true
    },
    members: {
        type: [memberSchema],
        default: []
    },
    memberIds: {
        type: [String],
        default: [],
        index: true
    },
    directKey: {
        type: String,
        default: null
    },
    lastSeq: {
        type: Number,
        required: true,
        default: 0
    },
    lastMessageAt: {
        type: Date,
        default: null
    },
    keyEpoch: {
        type: Number,
        required: true,
        default: 1
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {timestamps: true});

// most recent first
conversationSchema.index({memberIds: 1, lastMessageAt: -1});

// Ensures each direct chat has a unique directKey; ignores null/non-string keys used by group chats.
conversationSchema.index(
    {directKey: 1},
    {unique: true, partialFilterExpression: {directKey: {$type: 'string'}}}
);

export const ConversationModel =
    mongoose.model('Conversation', conversationSchema);

export const buildDirectKey = (userIdA, userIdB) =>
    [String(userIdA), String(userIdB)].sort().join(':');