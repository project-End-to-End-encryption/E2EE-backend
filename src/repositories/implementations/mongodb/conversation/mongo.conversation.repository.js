import mongoose from "mongoose";
import {ConversationModel, buildDirectKey} from "../../../../infrastructure/database/mongodb/models/conversation.model.js";
import IConversationRepository from "../../../interfaces/database/conversation/conversation.repository.js";
const toId = (value) => (value ? String(value) : value);

class MongoConversationRepository extends IConversationRepository{

    async createGroup({name, createdBy, memberIds, avatarKey = null}){
        const unique = Array.from(new Set([toId(createdBy), ...memberIds.map(toId)]));

        const doc = await ConversationModel.create({
            type: 'group',
            name,
            avatarKey,
            createdBy: toId(createdBy),
            members: unique.map((userId) => ({
                userId,
                role: userId === toId(createdBy) ? 'owner' : 'member',
                joinedAtSeq: 0
            })),
            memberIds: unique,
            directKey: null
        });

        return doc.toObject();
    }

    async findOrCreateDirect(userIdA, userIdB) {
        const a = toId(userIdA);
        const b = toId(userIdB);

        if( a === b) throw new Error('CANNOT_DM_SELF');

        const directKey = buildDirectKey(a, b);
        const members = [a, b];

        try{
            const doc = await ConversationModel.findOneAndUpdate(
                {directKey},
                {
                    $setOnInsert: {
                        type: 'direct',
                        directKey,
                        createdBy: a,
                        members: members.map((userId) => ({userId, role: 'member', joinedAtSeq: 0})),
                        memberIds: members,
                        lastSeq: 0,
                        keyEpoch: 1
                    }
                },
                {
                    returnDocument: 'after', upsert: true, setDefaultsOnInsert: true
                }
            ).lean();
            return doc;
        } catch(error){
            if(error?.code === 11000){
                return ConversationModel.findOne({ directKey }).lean();
            }
            throw error;
        }
    }

    async findById(conversationId){
        if(!mongoose.isValidObjectId(conversationId)) return null;
        return ConversationModel.findById(conversationId).lean();
    }

    async findByUserId(userId, {limit = 100, before = null, includeMembers = true} = {}) {
        const filter = {memberIds: toId(userId), isActive: true};
        if(before) filter.lastMessageAt = {$lt: before};

        const projection = includeMembers ? {} : {members: 0};

        return ConversationModel.find(filter, projection)
            .sort({lastMessageAt: -1, _id: -1})
            .limit(Math.min(limit, 200))
            .lean();
    }

    async isMember(conversationId, userId){
        if(!mongoose.isValidObjectId(conversationId)) return null;
        return (await ConversationModel.countDocuments({
            _id: conversationId,
            memberIds: toId(userId)
        })) > 0;
    }

    /**
     *  $ne guard makes this idempotent - re-adding an existing member is a no-op
     *  rather than a duplicate entry. Returns null when nothing changed so the
     *  caller can tell "already a member" from "added".
     */

    async addMember(conversationId, userId, role = 'member'){
        const id = toId(userId);

        return ConversationModel.findOneAndUpdate(
            {_id: conversationId, memberIds: {$ne: id}},
            {
                $push: {
                    members: {
                        userId: id,
                        role,
                        joinedAt: new Date(),
                        joinedAtSeq: 0
                    }
                },
                $addToSet: {memberIds: id}
            },
            {returnDocument: 'after'}
        ).lean();
    }
    async removeMember(conversationId, userId) {
        const id = toId(userId);

        return ConversationModel.findOneAndUpdate(
            { _id: conversationId },
            {
                $pull: {
                    members: { userId: id },
                    memberIds: id
                }
            },
            { returnDocument: 'after' }
        ).lean();
    }

    /**
     * Atomically allocate the next sequence number.
     * One round trip, no transaction, no read-modify-write.
     */

    async reserveSeq(conversationId, sentAt = new Date()){
        const doc = await ConversationModel.findOneAndUpdate(
            {_id: conversationId},
            {
                $inc: {lastSeq: 1},
                $set: {lastMessageAt: sentAt}
            },
            {
                returnDocument: 'after', projection: {lastSeq: 1, keyEpoch: 1, memberIds: 1, type: 1}
            }
        ).lean();

        if(!doc) return null;

        return {seq: doc.lastSeq, keyEpoch: doc.keyEpoch, memberIds: doc.memberIds, type: doc.type}
    }
    async bumpKeyEpoch(conversationId){
        const doc = await ConversationModel.findOneAndUpdate(
            {_id: conversationId},
            {$inc: {keyEpoch: 1}},
            {returnDocument: 'after', projection: {keyEpoch: 1}}
        ).lean();
        return doc?.keyEpoch ?? null;
    }
}

export default new MongoConversationRepository();