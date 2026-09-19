import { SOCKET_EVENTS } from '../../../shared/constants/socketEvents.js';
import { withRateLimit, RATE_LIMITS } from '../../../shared/utils/rateLimiter.js';
import * as mediaService from '../../media/media.service.js';

export const registerMediaEvents = (io, socket) => {
    const { userId } = socket.user;

    socket.on(SOCKET_EVENTS.MEDIA_REQUEST_UPLOAD, withRateLimit(
        'media', RATE_LIMITS.media, userId,
        async (payload, ack) => {
            const result = await mediaService.requestUpload(userId, payload);
            ack?.({ ok: true, ...result });
        }
    ));

    socket.on(SOCKET_EVENTS.MEDIA_COMPLETE_UPLOAD, withRateLimit(
        'media', RATE_LIMITS.media, userId,
        async (payload, ack) => {
            const result = await mediaService.completeUpload(userId, payload);
            ack?.({ ok: true, ...result });
        }
    ));

    socket.on(SOCKET_EVENTS.MEDIA_REQUEST_DOWNLOAD, withRateLimit(
        'media', RATE_LIMITS.media, userId,
        async (payload, ack) => {
            const result = await mediaService.requestDownload(userId, payload);
            ack?.({ ok: true, ...result });
        }
    ));

    socket.on(SOCKET_EVENTS.MEDIA_ABORT_UPLOAD, withRateLimit(
        'media', RATE_LIMITS.media, userId,
        async (payload, ack) => {
            const result = await mediaService.abortUpload(userId, payload);
            ack?.({ ok: true, ...result });
        }
    ));
};
