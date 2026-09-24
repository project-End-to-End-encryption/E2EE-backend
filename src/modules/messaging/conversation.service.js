import redisClient from "../../config/redis.config.js";
import ConversationRepository from '../../repositories/implementations/mongodb/conversation/mongo.conversation.repository.js'
import ConversationKeyRepository from '../../repositories/implementations/mongodb/conversation/mongo.conversationKey.repository.js'
import ConversationStateRepository from '../../repositories/implementations/mongodb/conversation/mongo.conversationState.repository.js'
import {listUserDevice} from "../keys/keys.service.js";
import{ REDIS_KEYS, REDIS_TTL} from "../../shared/constants/redisKeys.js";
import {MessagingException, NotFoundException, ForbiddenException} from "../../shared/errors/domainErrors.js";

/**
 * CONVERSATION SERVICE
 *  Membership, archive-key custody, and the device fan-out list.
 *
 *
 * Membership cache -->
 *  Membership is read on EVERY message (authorisation + fan-out) but written almost never.
 *  This is the textbook cache profile, and without it the membership lookup is the hottest query in the system
 */

const getMemberIdCached = async (conversationId) => {
    const key = REDIS_KEYS.conversationMembers(conversationId);

    try{
        const cached = await redisClient.get(key);
        if(cached) return JSON.parse(cached);
    } catch {
        // cache failed go to mongo db
    }

    const conversation = await ConversationRepository.findById(conversationId);
    if(!conversation) return null;

    const memberIds = conversation.memberIds || [];

    try{
        await redisClient.setEx(key, REDIS_TTL.conversationMembers, JSON.stringify(memberIds))
    } catch {
        // go to mongo cache evict
    }
    return memberIds;
};

const invalidateMembers = async (conversationId) => {
    try {
        await redisClient.del(REDIS_KEYS.conversationMembers(conversationId));
    } catch {  }
};

export const isMember = async (conversationId, userId) => {
    const memberIds = await getMemberIdCached(conversationId);
    if(!memberIds) return false;
    return memberIds.includes(String(userId));
};

export const getMemberIds = getMemberIdCached;

export const openDirectConversation = async (userId, peerUserId) => {
    if(!peerUserId) throw new MessagingException('peerUserId required', 'INVALID_PAYLOAD');
    if(String(userId) === String(peerUserId)){
        throw new MessagingException('Cannot open a chat with yourself','INVALID_PAYLOAD');
    }

    const conversation = await ConversationRepository.findOrCreateDirect(userId, peerUserId);
    await invalidateMembers(conversation._id.toString());
    return conversation;
};

export const createGroupConversation = async (
    creatorUserId,
    { name, memberUserIds = [], avatarKey = null }
) => {

    if(!name || !name.trim()) throw new MessagingException('Group name required', 'INVALID_PAYLOAD');

    if(memberUserIds.length > 256){
        throw new MessagingException('Group exceeds maximum size', 'GROUP_TOO_LARGE');
    }

    return ConversationRepository.createGroup({
        name: name.trim(),
        createdBy: creatorUserId,
        memberIds: memberUserIds,
        avatarKey
    });
};

// Listing

export const listConversations = async (userId, option = {}) => {
    const conversations = await ConversationRepository.findByUserId(userId, option);

    if(!conversations.length) return [];

    const ids = conversations.map((c)=> c._id.toString());
    const states = await ConversationStateRepository.getManyForUser(userId, ids);
    const stateByConversation = new Map(states.map((s) => [s.conversationId, s]));

    return conversations.map((conversation) => {
        const id = conversation._id.toString();
        const state = stateByConversation.get(id);
        const lastReadSeq = state?.lastReadSeq ?? 0;

        return {
            ...conversation,
            _id: id,
            unreadCount: Math.max(0, (conversation.lastSeq || 0) - lastReadSeq),
            lastReadSeq,
            clearedBeforeSeq: state?.clearedBeforeSeq ?? 0,
            isArchived: state?.isArchived ?? false,
            isPinned: state?.isPinned ?? false,
            mutedUntil: state?.mutedUntil ?? null
        };
    })
};

// Membership changes

const requireRole = (conversation, userId, roles) =>{
    const member = conversation.members.find((m) => String(m.userId) === String(userId));
    if(!member) throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    if(!roles.includes(member.role)) {
        throw new ForbiddenException('Insufficient permissions', 'NOT_AUTHORIZED');
    }
    return member;
};

export const addMember = async (conversationId, requesterId, newUserId) => {
    const conversation = await ConversationRepository.findById(conversationId);
    if(!conversation) throw new NotFoundException('Conversation not found');
    if(conversation.type === 'direct') {
        throw new MessagingException('Cannot add members to a direct chat', 'INVALID_OPERATION');
    }
    requireRole(conversation, requesterId, ['owner', 'admin']);

    const updated = await ConversationRepository.addMember(conversationId, newUserId);
    await invalidateMembers(conversationId);

    const newEpoch = await ConversationRepository.bumpKeyEpoch(conversationId);

    return {
        // `updated` was read BEFORE the bump, so overwrite its stale keyEpoch
        conversation: { ...updated, keyEpoch: newEpoch },
        keyEpoch: newEpoch,
        rekeyRequired: true
    };
};

/**
 * Remove member from group
 *
 *  Pulling someone out of memberIds stops the SERVER routing messages to them
 */

export const removeMember = async (conversationId, requesterId, targetUserId) => {
    const conversation = await ConversationRepository.findById(conversationId);

    if(!conversation) throw new NotFoundException('Conversation not found');
    if(conversation.type === 'direct'){
        throw new MessagingException('Cannot remove members from a direct chat', 'INVALID_OPERATION');
    }

    const isSelfRemoval = String(requesterId) === String(targetUserId);
    if(!isSelfRemoval) requireRole(conversation, requesterId, ['owner', 'admin']);

    const target = conversation.members.find((m) => String(m.userId) === String(targetUserId));
    if(target?.role === 'owner' && !isSelfRemoval){
        throw new ForbiddenException('Cannot remove the group owner', 'NOT_AUTHORIZED');
    }
    const updated = await ConversationRepository.removeMember(conversationId, targetUserId);
    await invalidateMembers(conversationId);
    const newEpoch = await ConversationRepository.bumpKeyEpoch(conversationId);

    return {
        conversation: updated,
        keyEpoch: newEpoch,
        rekeyRequired: true
    };
}
/**
 * Device fan-out
 *   Flattens membership into the full device list.
 *   The client needs this to know how many transport envelopes to build - E2EE is per DEVICE, not per user, so a user
 *   with a laptop and a phone needs two envelopes.
 */

export const getMemberDevices = async (
    conversationId,
    { requesterId, excludeUserId, excludeDeviceId } = {}
) => {
    const memberIds = await getMemberIdCached(conversationId);

    if (!memberIds) {
        throw new NotFoundException('Conversation not found');
    }

    if (!memberIds.includes(String(requesterId))) {
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }

    const perMember = await Promise.all(
        memberIds.map(async (userId) => {
            const devices = await listUserDevice(userId);

            return devices;
        })
    );

    const devices = perMember
        .flat()
        .filter((device) => !(
            String(device.userId) === String(excludeUserId) &&
            device.deviceId === excludeDeviceId
        ));


    return devices;
};

/**
 * Archive key custody
 *  Store a member's MBK-wrapped copy of the Conversation Archive Key.
 */

/**
 * Store a member's MBK-wrapped copy of the Conversation Archive Key.
 *
 *  mode 'mint': "I am creating this epoch's key for the whole conversation".
 *               Only ONE member can ever win this per (conversation, epoch).
 *  mode 'copy': "I received the key from the minter; store my own wrapped copy".
 */
export const putArchiveKey = async (
    conversationId,
    userId,
    { epoch, iv, ciphertext, blobGeneration, mode = 'copy' }
) => {
    if (!(await isMember(conversationId, userId))) {
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }

    const epochNum = Number(epoch);
    const conversation = await ConversationRepository.findById(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    // A member must not be able to pre-claim epochs that don't exist yet
    if (!Number.isInteger(epochNum) || epochNum < 1 || epochNum > (conversation.keyEpoch ?? 1)) {
        throw new MessagingException('Invalid epoch', 'INVALID_PAYLOAD');
    }

    if (mode === 'mint') {
        // Atomic: the unique (conversationId, epoch) index decides the winner
        const won = await ConversationKeyRepository.claimEpoch(conversationId, epochNum, userId);
        if (!won) {
            throw new MessagingException('Archive key already minted for this epoch', 'ARCHIVE_KEY_EXISTS');
        }
    } else if (!(await ConversationKeyRepository.isEpochClaimed(conversationId, epochNum))) {
        throw new MessagingException('No archive key minted for this epoch yet', 'ARCHIVE_KEY_NOT_MINTED');
    }

    try {
        // $setOnInsert never modifies an existing copy, so this cannot overwrite a key
        await ConversationKeyRepository.insertCopyOnce(conversationId, userId, {
            epoch: epochNum, iv, ciphertext, blobGeneration
        });
    } catch (error) {
        // Don't leave a claim behind with no key stored, or nobody can ever mint this epoch
        if (mode === 'mint') {
            await ConversationKeyRepository.releaseClaim(conversationId, epochNum, userId).catch(() => {});
        }
        throw error;
    }

    return { epoch: epochNum };
};export const getArchiveKey = async (conversationId, userId, epoch = null) => {
    if(!(await isMember(conversationId, userId))){
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }
    return ConversationKeyRepository.findForUser(conversationId, userId, epoch);
};

export const getAllArchiveKeyEpochs = async (conversationId, userId) => {
    if(!(await isMember(conversationId, userId))){
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }
    return ConversationKeyRepository.findAllEpoch(conversationId, userId);
};

export const listMyArchiveKeys = (userId, options) =>
    ConversationKeyRepository.listForUser(userId, options);

export const markRead = (conversationId, userId, seq) =>
    ConversationStateRepository.markRead(conversationId, userId, seq);

export const markDelivered = (conversationId, userId, seq) =>
    ConversationStateRepository.markDelivered(conversationId, userId, seq);

export const clearChat = (conversationId, userId, seq) =>
    ConversationStateRepository.clearBefore(conversationId, userId, seq);

export const setFlags = (conversationId, userId, flags) =>
    ConversationStateRepository.setFlags(conversationId, userId, flags);

export const getState = (conversationId, userId) =>
    ConversationStateRepository.get(conversationId, userId);