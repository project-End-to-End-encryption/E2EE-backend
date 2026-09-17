import {ConversationStateModel} from "../../../../infrastructure/database/mongodb/models/conversationState.model.js";


class MongoConversationStateRepository{
    async markRead(conversationId, userId, seq){
        return ConversationStateModel.findOneAndUpdate(
            {conversationId, userId: String(userId)},
            {$max: {lastReadSeq: Number(seq), lastDeliveredSeq: Number(seq)}},
        {returnDocument: 'after', upsert: true, setDefaultsOnInsert: true}
        ).lean();
    }

    async markDelivered(conversationId, userId, seq){
        return ConversationStateModel.findOneAndUpdate(
            {conversationId, userId: String(userId)},
            {$max: {lastDeliveredSeq: Number(seq)}},
            {returnDocument: 'after', upsert: true, setDefaultsOnInsert: true}
        ).lean();
    }

    async get(conversationId, userId){
        return ConversationStateModel.findOne({
            conversationId,
            userId: String(userId)
        }).lean();
    }

    /**
     * Batched for the sidebar
     */

    async getManyForUser(userId, conversationIds){
        if(!conversationIds?.length) return [];

        return ConversationStateModel.find({
            userId: String(userId),
            conversationId: {$in: conversationIds}
        }).lean();
    }

    /**
     * Clear chats on device account only. other members are unaffected.
     */

    async clearBefore(conversationId, userId, seq){
        return ConversationStateModel.findOneAndUpdate(
            {conversationId, userId: String(userId)},
            {$max: {clearedBeforeSeq: Number(seq)}},
            {returnDocument: 'after', upsert: true, setDefaultsOnInsert: true}
        ).lean();
    }

    async setFlags(conversationId, userId, flags){
        const allowed = {};
        if(typeof flags.isArchived === 'boolean') allowed.isArchived = flags.isArchived;
        if(typeof flags.isPinned === 'boolean') allowed.isPinned = flags.isPinned;
        if('mutedUntil' in flags) allowed.mutedUntil = flags.mutedUntil;

        return ConversationStateModel.findOneAndUpdate(
            {conversationId, userId: String(userId)},
            {$set: allowed},
            {returnDocument: 'after', upsert: true, setDefaultsOnInsert: true}
        ).lean();
    }

    async deleteAllForUser(userId){
        return ConversationStateModel.deleteMany({userId: String(userId)});
    }
}

export default new MongoConversationStateRepository();