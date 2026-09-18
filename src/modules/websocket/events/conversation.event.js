import * as conversationService from "../../messaging/conversation.service.js";
import {userRoom, conversationRoom} from "../../../shared/utils/socketRooms.js";
import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {withRateLimit, RATE_LIMITS} from "../../../shared/utils/rateLimiter.js";

export const registerConversationEvents = (io, socket) => {
    const { userId, deviceId } = socket.user;

    // open a 1:1 chat
    socket.on(SOCKET_EVENTS.CONVERSATION_OPEN_DIRECT, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ peerUserId }, ack) => {
            const conversation = await conversationService.openDirectConversation(userId, peerUserId);
            const conversationId = conversation._id.toString();

            // Both participants' sockets (all their devices) join the room.
            io.in(userRoom(userId)).socketsJoin(conversationRoom(conversationId));
            io.in(userRoom(peerUserId)).socketsJoin(conversationRoom(conversationId));

            // The peer may not have this chat in their sidebar yet.
            io.to(userRoom(peerUserId)).emit(SOCKET_EVENTS.CONVERSATION_CREATED, {
                conversation: { ...conversation, _id: conversationId }
            });

            ack?.({ ok: true, conversation: { ...conversation, _id: conversationId } });
        }
    ));

    // create a group

    socket.on(SOCKET_EVENTS.CONVERSATION_CREATE_GROUP, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ name, memberUserIds, avatarKey }, ack) => {
            const conversation = await conversationService.createGroupConversation(userId, {
                name, memberUserIds, avatarKey
            });
            const conversationId = conversation._id.toString();
            const room = conversationRoom(conversationId);

            // socketsJoin works across nodes via the Redis adapter, so this is
            // correct on a single process and on a twenty-pod deployment alike.
            for (const memberId of conversation.memberIds) {
                io.in(userRoom(memberId)).socketsJoin(room);
                io.to(userRoom(memberId)).emit(SOCKET_EVENTS.CONVERSATION_CREATED, {
                    conversation: { ...conversation, _id: conversationId }
                });
            }

            ack?.({ ok: true, conversation: { ...conversation, _id: conversationId } });
        }
    ));

    // list

    socket.on(SOCKET_EVENTS.CONVERSATION_LIST, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async (_payload, ack) => {
            const conversations = await conversationService.listConversations(userId);
            ack?.({ ok: true, conversations });
        }
    ));

    // membership
    socket.on(SOCKET_EVENTS.CONVERSATION_ADD_MEMBER, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ conversationId, newUserId }, ack) => {
            const conversation = await conversationService.addMember(conversationId, userId, newUserId);
            const room = conversationRoom(conversationId);

            io.in(userRoom(newUserId)).socketsJoin(room);
            io.to(room).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
                conversationId, change: 'memberAdded', userId: newUserId
            });


            ack?.({ ok: true, conversation, distributeKeyTo: newUserId });
        }
    ));

    // remove member
    socket.on(SOCKET_EVENTS.CONVERSATION_REMOVE_MEMBER, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ conversationId, targetUserId }, ack) => {
            const result = await conversationService.removeMember(conversationId, userId, targetUserId);
            const room = conversationRoom(conversationId);

            io.in(userRoom(targetUserId)).socketsLeave(room);

            // rekeyRequired tells remaining clients to mint a CAK for the new epoch.
            // Without it, the removed member could still decrypt future messages if
            // they ever obtained the ciphertext - removal would be cosmetic.
            io.to(room).emit(SOCKET_EVENTS.CONVERSATION_UPDATED, {
                conversationId,
                change: 'memberRemoved',
                userId: targetUserId,
                keyEpoch: result.keyEpoch,
                rekeyRequired: true
            });

            ack?.({ ok: true, ...result });
        }
    ));

    // device fan-out

    socket.on(SOCKET_EVENTS.CONVERSATION_MEMBER_DEVICES, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async ({ conversationId, includeOwnOtherDevices = true }, ack) => {
            const devices = await conversationService.getMemberDevices(conversationId, {
                excludeUserId: userId,
                // Your OTHER devices must receive their own copy, or messages you
                // send from your phone never appear on your laptop in real time.
                excludeDeviceId: includeOwnOtherDevices ? deviceId : null
            });
            ack?.({ ok: true, devices });
        }
    ));

    socket.on(SOCKET_EVENTS.CONVERSATION_PUT_KEY, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ conversationId, epoch, iv, ciphertext, blobGeneration }, ack) => {
            const saved = await conversationService.putArchiveKey(conversationId, userId, {
                epoch, iv, ciphertext, blobGeneration
            });
            ack?.({ ok: true, epoch: saved.epoch });
        }
    ));

    socket.on(SOCKET_EVENTS.CONVERSATION_GET_KEY, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async ({ conversationId, epoch = null, allEpochs = false }, ack) => {
            if (allEpochs) {
                const keys = await conversationService.getAllArchiveKeyEpochs(conversationId, userId);
                return ack?.({ ok: true, keys });
            }
            const key = await conversationService.getArchiveKey(conversationId, userId, epoch);
            ack?.({ ok: true, key });
        }
    ));
}