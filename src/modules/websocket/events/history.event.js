import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {withRateLimit, RATE_LIMITS} from "../../../shared/utils/rateLimiter.js";
import * as messageService from "../../messaging/message.service.js"
import * as conversationService from "../../messaging/conversation.service.js"

/**
 * HISTORY OVER SOCKETS
 */

const HISTORY_MAX_PAGE = 100;     // rows per history:page
const RANGE_MAX_SPAN = 500;       // seq span per history:range
const KEYS_MAX_PAGE = 500;        // wrapped CAKs per page

export const registerHistoryEvents = (io, socket) => {
    const {userId} = socket.user;

    socket.on(SOCKET_EVENTS.HISTORY_PAGE, withRateLimit(
        'syncPull', RATE_LIMITS.syncPull, userId,
        async ({conversationId, beforeSeq, afterSeq, limit} = {}, ack) =>{
            if(!conversationId) return ack?.({ok: false, error: 'INVALID_PAYLOAD'});

            const result = await messageService.getHistory(conversationId, userId, {
                beforeSeq: beforeSeq === undefined || beforeSeq === null ? null : Number(beforeSeq),
                afterSeq: afterSeq === undefined || afterSeq === null ? null : Number(afterSeq),
                limit: Math.min(Number(limit) || 50 , HISTORY_MAX_PAGE)
            });

            ack?.({ok:true, conversationId, ...result});
        }
    ));

    // conversation:listArchiveKeys
    socket.on(SOCKET_EVENTS.CONVERSATION_LIST_KEYS, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async ({sinceId = null, limit} = {}, ack) => {
            const pageSize = Math.min(Number(limit) || KEYS_MAX_PAGE, KEYS_MAX_PAGE);

            const keys = await conversationService.listMyArchiveKeys(userId, {
                sinceId, limit: pageSize
            });

            ack?.({ok: true,
                keys,
                nextCursor: keys.length ? String(keys[keys.length - 1]._id) : null,
                hasMore: keys.length === pageSize
            });
        }
    ));
};