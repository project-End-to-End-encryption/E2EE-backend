import IConversationKeyRepository from "../../../interfaces/database/conversation/conversationKey.repository.js";
import {ConversationKeyModel} from "../../../../infrastructure/database/mongodb/models/conversationKey.model.js";

class MongoConversationKeyRepository extends IConversationKeyRepository{

    async upsert({conversationId, userId, epoch, iv, ciphertext, blobGeneration}){
        return ConversationKeyModel.findOneAndUpdate(
            {conversationId, userId: String(userId), epoch},
            {$set: {iv, ciphertext, blobGeneration}},
            { returnDocument: 'after', upsert: true, runValidators: true }
        ).lean();
    }

    async findForUser(conversationId, userId, epoch = null){
        const filter = {conversationId, userId: String(userId)};

        if(epoch !== null) filter.epoch = epoch;

        return ConversationKeyModel.findOne(filter).sort({epoch: -1}).lean();
    }

    async findAllEpoch(conversationId, userId){
        return ConversationKeyModel.find({conversationId, userId: String(userId)})
            .sort({epoch: 1})
            .lean();
    }

    /**
     * Paged, because a heavy user restoring on a new device could have thousands of these,
     * and we do not want one unbounded response.
     */

    async listForUser(userId, {sinceId = null, limit = 500} = {}){
        const filter = {userId: String(userId)};
        if(sinceId) filter._id = {$gt: sinceId};

        return ConversationKeyModel.find(filter)
            .sort({_id: 1})
            .limit(Math.min(limit, 1000))
            .lean();
    }

    async deleteAllForUser(userId){
        return ConversationKeyModel.deleteMany({userId: String(userId)});
    }

    async countForConversation(conversationId){
        return ConversationKeyModel.countDocuments({conversationId});
    }
}

export default new MongoConversationKeyRepository();
