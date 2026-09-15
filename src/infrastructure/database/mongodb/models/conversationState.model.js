/**
 *  ConversationState
 *  Per-(user, conversation) cursors
 *
 *  The naive design is one "delivery" row per message per recipient. A 50-member
 *  group sending 1000 messages a day writes 50,000 rows a day. At 5k concurrent
 *  users that collection becomes the bottleneck before anything else does
 *
 *  Instead: store ONE row per user per conversation holding high-water marks.
 *  "Delivered up to seq 412", "read up to seq 400". Ticks and unread counts are
 *  derived arithmetic (lastSeq - lastReadSeq), not aggregation
 */
import mongoose from "mongoose";

const conversationStateSchema = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    lastReadSeq: {
        type: Number,
        default: 0
    },
    lastDeliveredSeq: {
        type: Number,
        default: 0
    },
    isArchived: {
        type: Boolean,
        default: false
    },
    isPinned: {
        type: Boolean,
        default: false
    },
    mutedUntil: {
        type: Date,
        default: null
    },
    clearedBeforeSeq: {
        type: Number,
        default: 0
    }
}, {timestamps: true});

conversationStateSchema.index({conversationId: 1, userId: 1}, {unique:true});
conversationStateSchema.index({userId: 1, isArchived: 1});

export const ConversationStateModel = mongoose.model('ConversationState', conversationStateSchema);