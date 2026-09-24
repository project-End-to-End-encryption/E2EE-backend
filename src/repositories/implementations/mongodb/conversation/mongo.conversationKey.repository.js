import IConversationKeyRepository from "../../../interfaces/database/conversation/conversationKey.repository.js";
import {ConversationKeyModel} from "../../../../infrastructure/database/mongodb/models/conversationKey.model.js";
import {ConversationKeyClaimModel } from "../../../../infrastructure/database/mongodb/models/conversationKeyClaim.model.js"

class MongoConversationKeyRepository extends IConversationKeyRepository{

    async claimEpoch(conversationId, epoch, userId) {
        try {
            await ConversationKeyClaimModel.create({
                conversationId, epoch, mintedBy: String(userId)
            });
            return true;
        } catch (error) {
            if (error?.code === 11000) return false;   // duplicate key: lost the race
            throw error;
        }
    }

    async isEpochClaimed(conversationId, epoch) {
        return !!(await ConversationKeyClaimModel.exists({ conversationId, epoch }));
    }

    async releaseClaim(conversationId, epoch, userId) {
        await ConversationKeyClaimModel.deleteOne({
            conversationId, epoch, mintedBy: String(userId)
        });
    }

    async insertCopyOnce(conversationId, userId, { epoch, iv, ciphertext, blobGeneration }) {
        try {
            await ConversationKeyModel.create({
                conversationId, userId: String(userId), epoch, iv, ciphertext, blobGeneration
            });
        } catch (error) {
            if (error?.code !== 11000) throw error;   // real errors still surface
        }
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
