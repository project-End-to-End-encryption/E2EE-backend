import * as messageService from "../../messaging/message.service.js"
import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {withRateLimit, RATE_LIMITS} from "../../../shared/utils/rateLimiter.js";


export const registerSyncEvents = (io, socket) => {
    const {userId, deviceId} = socket.user;

    socket.on(SOCKET_EVENTS.SYNC_PULL, withRateLimit(
        'syncPull', RATE_LIMITS.syncPull, userId,
        async ({afterId = null, limit = 200} = {}, ack) => {
            const envelopes = await messageService.pullPending(userId, deviceId, {afterId, limit});

            ack?.({
                ok: true,
                envelopes,
                // _id is monotonic, so it doubles as the paging cursor.
                nextCursor: envelopes.length ? envelopes[envelopes.length - 1]._id : null,
                hasMore: envelopes.length === Math.min(limit, 500)
            });
        }
    ));

    socket.on(SOCKET_EVENTS.SYNC_ACK, withRateLimit(
        'syncPull', RATE_LIMITS.syncPull, userId,
        async ({ ids = [] }, ack) => {
            if (!Array.isArray(ids) || !ids.length) {
                return ack?.({ ok: true, deleted: 0 });
            }

            // Bounded so one client cannot hand us a 100k-element $in.
            const result = await messageService.ackPending(userId, deviceId, ids.slice(0, 500));
            ack?.({ ok: true, deleted: result.deletedCount });
        }
    ));

}
