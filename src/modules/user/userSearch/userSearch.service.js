import MongoUserRepository from '../../../repositories/implementations/mongodb/user/mongo.user.repository.js';
import { MessagingException } from '../../../shared/errors/domainErrors.js';



const userRepository = new MongoUserRepository();

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 64;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 20;

const toPublicUser = (user) => ({
    userId: String(user._id),
    username: user.username,
    fullName: user.fullName ?? null,
    profilePictureKey: user.profilePictureKey ?? null
});

export const searchUsers = async (requesterUserId, { query, limit } = {}) => {
    const term = String(query ?? '').trim();

    if (!term) {
        throw new MessagingException('Search query is empty', 'INVALID_SEARCH_QUERY');
    }
    if (term.length < MIN_QUERY_LENGTH) {
        throw new MessagingException('Search query is too short', 'INVALID_SEARCH_QUERY');
    }
    if (term.length > MAX_QUERY_LENGTH) {
        throw new MessagingException('Search query is too long', 'INVALID_SEARCH_QUERY');
    }

    const users = await userRepository.searchDirectory(term, {
        limit: Math.min(Number(limit) || DEFAULT_LIMIT, MAX_LIMIT),
        excludeUserId: requesterUserId
    });

    return users.map(toPublicUser);
};


export const getProfiles = async (userIds = []) => {
    const ids = [...new Set(
        (Array.isArray(userIds) ? userIds : [])
            .map((id) => String(id))
            .filter(Boolean)
    )].slice(0, 200);

    if (!ids.length) return [];

    const users = await userRepository.findManyByIds(ids);
    return users.map(toPublicUser);
};
