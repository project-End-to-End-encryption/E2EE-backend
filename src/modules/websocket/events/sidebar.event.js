import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {withRateLimit, RATE_LIMITS} from "../../../shared/utils/rateLimiter.js";
import * as sidebarService from "../../messaging/sidebar.service.js"
import * as conversationService from "../../messaging/conversation.service.js"
import {userRoom} from "../../../shared/utils/socketRooms.js";

export const registerSidebarEvents = (io, socket) => {
    const {userId} = socket.user;

    socket.on(SOCKET_EVENTS.SIDEBAR_SYNC, withRateLimit(
        'syncPull', RATE_LIMITS.syncPull, userId,
        async (payload = {}, ack) => {
            const { since = null, afterId = null, schemaVersion = null, limit } = payload || {};

            const result = await sidebarService.sync(userId, {
                since: since === null || since === undefined ? null : Number(since),
                afterId,
                schemaVersion: Number(schemaVersion),
                limit
            });
            ack?.({ok: true, ...result});
        }
    ));

    // pin / mute / archive - per user

    socket.on(SOCKET_EVENTS.CONVERSATION_SET_FLAGS, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({conversationId, isPinned, isActive, mutedUntil}, ack) => {
            if (!(await conversationService.isMember(conversationId, userId))) {
                return ack?.({ ok: false, error: 'NOT_A_MEMBER' });
            }

            const state = await conversationService.setFlags(conversationId, userId, {
                isPinned, isActive, mutedUntil
            });

            await sidebarService.bumpSidebarRev([userId]);
            await pushSidebarPatch(io, conversationId, userId);

            ack?.({ok: true, state});
        }
    ));

    // "clear chat" - hides everything at or below `seq` for THIS user only.

    socket.on(SOCKET_EVENTS.CONVERSATION_CLEAR, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({conversationId, seq}, ack) => {
            if (!(await conversationService.isMember(conversationId, userId))) {
                return ack?.({ ok: false, error: 'NOT_A_MEMBER' });
            }
            const state = await conversationService.clearChat(conversationId, userId, seq);

            await sidebarService.bumpSidebarRev([userId]);
            await pushSidebarPatch(io, conversationId, userId);

            ack?.({ok: true, clearedBeforeSeq: state.clearedBeforeSeq});
        }
    ));
}
// Push a freshly built row to every device of one user.

export const pushSidebarPatch = async (io, conversationId, userId) => {
    try{
        const row = await sidebarService.buildRowFor(conversationId, userId);
        if(!row) return;

        io.to(userRoom(String(userId))).emit(SOCKET_EVENTS.SIDEBAR_PATCH, {conversation: row});
    } catch (error){
        console.error('[sidebar] patch push failed:', error.message);
    }
}