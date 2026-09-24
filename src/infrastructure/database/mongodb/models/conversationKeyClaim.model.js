import mongoose from 'mongoose';

// One row per (conversation, epoch): records WHO minted that epoch's key.
// The unique index below is what makes minting atomic across devices and users.
const schema = new mongoose.Schema(
    {
        // IMPORTANT: use the same type as conversationId in ConversationKeyModel
        conversationId: { type: mongoose.Schema.Types.ObjectId, required: true },
        epoch: { type: Number, required: true },
        mintedBy: { type: String, required: true }
    },
    { timestamps: true }
);

schema.index({ conversationId: 1, epoch: 1 }, { unique: true });

export const ConversationKeyClaimModel =
    mongoose.models.ConversationKeyClaim ||
    mongoose.model('ConversationKeyClaim', schema);