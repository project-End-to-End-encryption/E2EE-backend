/**
 * ConversationKey
 * The bridge between a user's Master Backup Key and a conversation's archive.
 *
 * Each conversation has ONE random 32-byte Conversation Archive Key (CAK) per
 *  * epoch. Every message in that conversation is encrypted once with the CAK - so a
 *  * 50-member group stores ONE ciphertext, not 50.
 *  *
 *
 *  epoch: version number of the conversation's encryption key
 *  * if someone leaves the group they can see the previous message but can't decrypt the new message it will rotate
 */

import mongoose from "mongoose";

const conversationKeySchema  = new mongoose.Schema({
    conversationId: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
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
    },
    blobGeneration: {
        type: Number,
        required: true,
        default: 1
    }
}, {timestamps: true});

conversationKeySchema.index(
    {conversationId: 1, userId: 1, epoch: 1},
    {unique: true}
);

conversationKeySchema.index(
    {userId: 1, conversationId: 1}
);

export const ConversationKeyModel =
    mongoose.model('ConversationKey', conversationKeySchema);