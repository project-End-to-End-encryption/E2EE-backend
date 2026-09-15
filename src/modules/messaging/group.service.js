import GroupRepository from "../../repositories/implementations/mongodb/group/mongo.group.repository.js";
import { listUserDevice } from '../keys/keys.service.js'

export const createGroup = async (creatorUserId, {name, memberUserIds = []}) =>{
    const uniqueMembers = Array.from(new Set([creatorUserId, ...memberUserIds]));
    return GroupRepository.create({
        name,
        createdBy: creatorUserId,
        members: uniqueMembers.map(userId => ({
            userId,
            role: userId === creatorUserId ? 'owner' : 'member'
        }))
    });
};

export const isGroupMember = (groupId, userId) => GroupRepository.isMember(groupId, userId);
export const getUserGroups = (userId) => GroupRepository.findByUserId(userId);

export const addMember = async (groupId, requesterId, newUserId) => {
    const group = await GroupRepository.findById(groupId);
    // TODO : add more validation
    if(!group) throw new Error('GROUP_NOT_FOUND');

    if (!group.members.some(m => String(m.userId) === String(requesterId))) {
        throw new Error('NOT_A_MEMBER');
    }

    return GroupRepository.addMember(groupId, newUserId);
}

export const removeMember = async (groupId, requesterId, targetUserId) => {
    const group = await GroupRepository.findById(groupId);
    if (!group) throw new Error('GROUP_NOT_FOUND');
    const requester = group.members.find(m => String(m.userId) === String(requesterId));
    if (!requester || (requester.role === 'member' && String(requesterId) !== String(targetUserId))) {
        throw new Error('NOT_AUTHORIZED');
    }
    return GroupRepository.removeMember(groupId, targetUserId);
}

// Flattens membership -> every member's registered devices. The client needs
// this list to know who to send sender-key distributions to (see GroupSessionManager).
export const getGroupMemberDevices = async (groupId, excludeUserId, excludeDeviceId) => {
    const group = await GroupRepository.findById(groupId);
    if(!group) throw new Error('GROUP_NOT_FOUND');

    const memberUserIds = group.members.map(m => m.userId);
    const devicesPerMember = await Promise.all(memberUserIds.map(listUserDevice));
    return devicesPerMember.flat().filter(device =>
        !(
           String( device.userId) === String(excludeUserId) &&
            device.deviceId === excludeDeviceId
        )
    );
}