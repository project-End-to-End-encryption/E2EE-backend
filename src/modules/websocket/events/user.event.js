import { SOCKET_EVENTS } from '../../../shared/constants/socketEvents.js';
import { withRateLimit, RATE_LIMITS } from '../../../shared/utils/rateLimiter.js';
import * as userSearchService from '../../user/userSearch/userSearch.service.js';

export const registerUserEvents = (io, socket) => {
    const { userId } = socket.user;

    socket.on(SOCKET_EVENTS.USERS_SEARCH, withRateLimit(
        'userSearch', RATE_LIMITS.userSearch, userId,
        async ({ query, limit } = {}, ack) => {
            const users = await userSearchService.searchUsers(userId, { query, limit });
            ack?.({ ok: true, users, query: String(query ?? '').trim() });
        }
    ));

    socket.on(SOCKET_EVENTS.USERS_PROFILES, withRateLimit(
        'userSearch', RATE_LIMITS.userSearch, userId,
        async ({ userIds } = {}, ack) => {
            const users = await userSearchService.getProfiles(userIds);
            ack?.({ ok: true, users });
        }
    ));
};
