import redisClient from "../../config/redis.config.js";
import ConversationRepository from "../../repositories/implementations/mongodb/conversation/mongo.conversation.repository.js";
import MessageRepository from "../../repositories/implementations/mongodb/messaging/mongo.message.repository.js";
import PendingEnvelopeRepository from "../../repositories/implementations/mongodb/messaging/mongo.pendingEnvelope.repository.js";
import ConversationStateRepository from "../../repositories/implementations/mongodb/conversation/mongo.conversationState.repository.js";
import * as conversationService from "./conversation.service.js"
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {MessagingException, ForbiddenException, NotFoundException} from "../../shared/errors/domainErrors.js";

/**
 * MESSAGE SERVICE
 *   Handles the two halves of a send
 *   ARCHIVE --> one durable row, encrypted with the Conversation Archive Key.
 *               Any device holding the MBK can read it
 *   TRANSPORT --> one ciphertext per recipient DEVICE, encrypted with the Double
 *                Ratchet (1:1) or a sender key (group). Forward secret, delivered
 *                once, discarded.
 */

const MAX_CIPHERTEXT_BYTES = 128 * 1024;   // ~96 KB of plaintext after base64
const MAX_ENVELOPES_PER_SEND = 512;        // fan-out ceiling per message

/**
 * Device presence
 *  Which of a user's devices are online right now.
 */

export const getOnlineDevices = async (userId) => {
    try{
        const device = await redisClient.sMembers(REDIS_KEYS.devicePresence(userId));
        return new Set(device);
    } catch {
        return new Set();
    }
};

const assertSendPayload = (payload) => {
    const {conversationId, clientMessageId, archive } = payload || {};

    if(!conversationId) throw new MessagingException('conversationId required', 'INVALID_PAYLOAD');
    if (!clientMessageId) throw new MessagingException('clientMessageId required', 'INVALID_PAYLOAD');

    if (!archive?.iv || !archive?.ciphertext) {
        throw new MessagingException('archive.iv and archive.ciphertext required', 'INVALID_PAYLOAD');
    }

    if (Buffer.byteLength(archive.ciphertext, 'utf8') > MAX_CIPHERTEXT_BYTES) {
        throw new MessagingException('Message too large', 'MESSAGE_TOO_LARGE');
    }
    if (payload.envelopes && !Array.isArray(payload.envelopes)) {
        throw new MessagingException('envelopes must be an array', 'INVALID_PAYLOAD');
    }

    if (payload.envelopes?.length > MAX_ENVELOPES_PER_SEND) {
        throw new MessagingException('Too many recipient devices', 'FANOUT_TOO_LARGE');
    }
}

export const sendMessage = async ({senderId, senderDeviceId, payload}) => {
    assertSendPayload(payload);

    const {
        conversationId,
        clientMessageId,
        contentType = 'text',
        archive,
        envelopes = [],
        groupPayload = null,
        attachments = [],
        sentAt
    } = payload;

    if(!(await conversationService.isMember(conversationId, senderId))) {
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }

    const clientSendAt = sentAt ? new Date(sentAt) : new Date();
    const reserved = await ConversationRepository.reserveSeq(conversationId, clientSendAt);
    if(!reserved) throw new NotFoundException('Conversation not found');

    const {message, duplicate} = await MessageRepository.insert({
        conversationId,
        senderId: String(senderId),
        senderDeviceId,
        seq: reserved.seq,
        clientMessageId,
        contentType,
        payload: {
            v: archive.v || 1,
            epoch: Number(archive.epoch) || reserved.keyEpoch || 1,
            iv: archive.iv,
            ciphertext: archive.ciphertext
        },
        attachments,
        sentAt: clientSendAt
    });

    if(duplicate){
        return{
            duplicate: true,
            message,
            deliverNow: [],
            queuedCount: 0,
            memberIds: reserved.memberIds
        };
    }
    const deliverNow = [];
    const toQueue = [];

    const byUser = new Map();
    for (const envelope of envelopes) {
        if (!envelope?.toUserId || !envelope?.toDeviceId) continue;
        const key = String(envelope.toUserId);
        if (!byUser.has(key)) byUser.set(key, []);
        byUser.get(key).push(envelope);
    }

    await Promise.all(Array.from(byUser.entries()).map(async ([userId, userEnvelopes]) => {
        const online = await getOnlineDevices(userId);

        for(const envelope of userEnvelopes){
            const target = {
                toUserId: userId,
                toDeviceId: envelope.toDeviceId,
                fromUserId: String(senderId),
                fromDeviceId: senderDeviceId,
                conversationId,
                kind: envelope.kind || 'message',
                envelop: {
                    ...envelope,
                    conversationId,
                    messageId: message._id.toString(),
                    seq: message.seq,
                    clientMessageId,
                    from: {userId: String(senderId), deviceId: senderDeviceId}
                }
            };
            if(online.has(envelop.toDeviceId)) deliverNow.push(target);
            else toQueue.push(target);
        }
    }));

    // one bulk write for every offline recipient
    if(toQueue.length) await PendingEnvelopeRepository.enqueueMany(toQueue);

    await ConversationStateRepository.markRead(conversationId, senderId, message.seq);

    return {
        duplicate: false,
        message,
        deliverNow,
        queuedCount: toQueue.length,
        memberIds: reserved.memberIds,
        groupPayload: groupPayload ? {...groupPayload, conversationId, seq: message.seq, messageId: message._id.toString()}
            : null
    };
};

/**
 * History ->
 *   A page of encrypted history.
 */

export const getHistory = async (conversationId, userId, {beforeSeq, afterSeq, limit = 50} = {}) =>{
    if(!(await conversationService.isMember(conversationId, userId))){
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }

    const state = await ConversationStateRepository.get(conversationId, userId);

    const messages = await MessageRepository.findPage(conversationId, {
        beforeSeq,
        afterSeq,
        limit,
        userId,
        clearedBeforeSeq: state?.clearedBeforeSeq ?? 0
    });

    return {
        messages,
        hasMore: messages.length === Math.min(Number(limit) || 50, 200),
        nextCursor: messages.length ? messages[messages.length - 1].seq : null
    };
};

export const getRange = async (conversationId, userId, fromSeq, toSeq) => {
    if (!(await conversationService.isMember(conversationId, userId))) {
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }
    // Bounded so a client cannot ask for a million rows in one shot.
    const span = Number(toSeq) - Number(fromSeq);

    if(span < 0 || span > 500){
        throw new MessagingException('Range too large', 'RANGE_TOO_LARGE');
    }
    return MessageRepository.findBySeqRange(conversationId, fromSeq, toSeq, userId);
};

export const deleteForMe = async (messageId, userId) => {
    const updated = await MessageRepository.hideForUser(messageId, userId);
    if(!updated) throw new NotFoundException('Message not found');
    return updated;
};

/**
 * Delete for everyone. Sender-only, enforced inside the query so there is no
 *   read-then-write window. The ciphertext is overwritten rather than flagged, so
 *   the content is genuinely unrecoverable from the archive.
 */

export const revokeMessage = async (messageId, userId) => {
    const updated = await MessageRepository.revoke(messageId, userId);
    if(!updated){
        throw new ForbiddenException('Cannot revoke this message', 'REVOKE_NOT_ALLOWED');
    }
    return updated;
};

export const pullPending = (userId, deviceId, { afterId, limit } = {}) =>
    PendingEnvelopeRepository.drain(userId, deviceId, { afterId, limit });

export const ackPending = (userId, deviceId, ids) =>
    PendingEnvelopeRepository.ackMany(userId, deviceId, ids);