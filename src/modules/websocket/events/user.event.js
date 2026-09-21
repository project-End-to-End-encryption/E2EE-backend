import { SOCKET_EVENTS } from '../../../shared/constants/socketEvents.js';
import { withRateLimit, RATE_LIMITS } from '../../../shared/utils/rateLimiter.js';
import * as userSearchService from '../../user/userSearch/userSearch.service.js';
import S3StorageRepository from '../../../repositories/implementations/s3/s3.storage.repository.js';
import MinioStorageRepository from '../../../repositories/implementations/minio/minio.storage.repository.js';

const storageProvider = process.env.S3_ENABLED === 'true' ? new S3StorageRepository() : new MinioStorageRepository();

export const registerUserEvents = (io, socket) => {
    const { userId } = socket.user;

    socket.on(SOCKET_EVENTS.USERS_GET_PROFILE_PICTURE_URL, withRateLimit(
        'profilePicture', RATE_LIMITS.userSearch, userId,
        async ({ profilePictureKey } = {}, ack) => {
            if (!profilePictureKey) return ack?.({ ok: false, error: 'No profilePictureKey provided' });
            try {
                const url = await storageProvider.getPresignedUrl(
                    storageProvider.buckets.profileAssets, profilePictureKey, 3600);
                ack?.({ ok: true, url });
            } catch (error) {
                ack?.({ ok: false, error: error.message });
            }
        }
    ));

    socket.on(SOCKET_EVENTS.USERS_SEARCH, withRateLimit('userSearch', RATE_LIMITS.userSearch, userId,
        async ({ query, limit } = {}, ack) => {
            const users = await userSearchService.searchUsers(userId, { query, limit });
            ack?.({ ok: true, users, query: String(query ?? '').trim() });
        }
    ));

    socket.on(SOCKET_EVENTS.USERS_PROFILES, withRateLimit('userSearch', RATE_LIMITS.userSearch, userId,
        async ({ userIds } = {}, ack) => {
            const users = await userSearchService.getProfiles(userIds);
            ack?.({ ok: true, users });
        }
    ));
};