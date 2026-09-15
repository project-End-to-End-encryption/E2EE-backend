import { GroupModel } from '../../../../infrastructure/database/mongodb/models/group.model.js'
import IGroupRepository from "../../../interfaces/database/group/group.repository.js";

class GroupRepository extends IGroupRepository{
    async create(data){
        const group = await GroupModel.create(data);
        return group.toObject();
    }
    async findById(groupId){
        return GroupModel.findById(groupId).lean();
    }
    async findByUserId(userId){
        return GroupModel.find({'members.userId': userId}).lean();
    }
    async addMember(groupId, userId){
        const group = await GroupModel.findOneAndUpdate(
            {
                _id: groupId,
                'members.userId': { $ne: userId }
            },
            {
                $push: { members: { userId, role: 'member', joinedAt: new Date() } }
            },
            { new: true } // Mongoose standard for returnDocument: 'after'
        ).lean();
        if (!group) {
            return this.findById(groupId);
        }
        return group;
    }
    async isMember(groupId, userId){
        return (await GroupModel.countDocuments({_id: groupId, 'members.userId': userId})) > 0;
    }
}

export default new GroupRepository();