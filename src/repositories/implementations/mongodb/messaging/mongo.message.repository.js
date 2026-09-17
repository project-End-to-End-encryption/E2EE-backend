import mongoose from "mongoose";
import {MessageModel} from "../../../../infrastructure/database/mongodb/models/message.model.js";
import IMessageRepository from "../../../interfaces/database/messaging/message.repository.js";

class MongoMessageRepository extends IMessageRepository{
    async insert(message){
        try{
            const doc = await MessageModel.create(message);
            return {message: doc.toObject(), duplicate: false}
        } catch (error){
            if(error?.code === 11000){
                const existing = await this.findByClientId(
                    message.conversationId,
                    message.clientMessageId
                );
                return {message: existing, duplicate: true};
            }
            throw error;
        }
    }

    async findByClientId(conversationId, clientMessageId){
        return MessageModel.findOne({conversationId, clientMessageId}).lean();
    }

    async findPage(conversationId,
                   {beforeSeq = null,
                       afterSeq = null,
                       limit = 50,
                       userId,
                       clearedBeforeSeq = 0} = {}
    ){
        const filter = { conversationId };
        const seqFilter = {};

        if(beforeSeq !== null && beforeSeq !== undefined) seqFilter.$lt = Number(beforeSeq)

        if(afterSeq !== null && afterSeq !== undefined) seqFilter.$gt = Number(afterSeq)

        if(clearedBeforeSeq){
            seqFilter.$gt = Math.max(Number(seqFilter.$gt ?? 0), Number(clearedBeforeSeq))
        }

        if(Object.keys(seqFilter).length) filter.seq = seqFilter;

        if(userId) filter.deletedFor = {$ne: String(userId)};

        const sortDir = afterSeq !== null && afterSeq !== undefined ? 1 : -1;

        return MessageModel.find(filter)
            .sort({seq: sortDir})
            .limit(Math.min(Number(limit) || 50, 200))
            .lean();
    }

    async findBySeqRange(conversationId, fromSeq, toSeq, userId) {
        const filter = {
            conversationId,
            seq: {$gte: Number(fromSeq), $lte: Number(toSeq)}
        };
        if(userId) filter.deletedFor = {$ne: String(userId)};
        return MessageModel.find(filter).sort({seq: 1}).lean();
    }

    // delete for me other member keep there copy
    async hideForUser(messageId, userId){
        if(!mongoose.isValidObjectId(messageId)) return null;
        return MessageModel.findByIdAndUpdate(
            messageId,
            {$addToSet: {deletedFor: String(userId)}},
            {returnDocument: 'after'}
        ).lean();
    }

    /**
     * delete for everyone only original user may perform this
     */

    async revoke(messageId, senderId){
        if(!mongoose.isValidObjectId(messageId)) return null;
        return MessageModel.findOneAndUpdate(
            {_id: messageId, senderId: String(senderId), isRevoked: false},
            {
                $set: {
                    isRevoked: true,
                    'payload.iv': '',
                    'payload.ciphertext': '',
                    attachments: []
                }
            },
            {returnDocument: 'after'}
        ).lean();
    }

    async deleteByConversation(conversationId){
        return MessageModel.deleteMany({conversationId});
    }

    async countByConversation(conversationId){
        return MessageModel.countDocuments({conversationId});
    }
}
 export default new MongoMessageRepository();