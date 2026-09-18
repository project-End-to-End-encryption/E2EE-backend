import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS, REDIS_TTL} from "../../shared/constants/redisKeys.js";
import {deviceRoom, conversationRoom, userRoom} from "../../shared/utils/socketRooms.js";
import * as conversationService from "../../modules/messaging/conversation.service.js";

const deviceSocketsKey = (userId, deviceId) => `presence:device:${userId}:${deviceId}`;

export const markOnline = async (userId, deviceId, socketId) => {
    const multi = redisClient.multi();

    multi.sAdd(REDIS_KEYS.userPresence(userId), socketId);
    multi.sAdd(REDIS_KEYS.devicePresence(userId), deviceId);
    multi.sAdd(deviceSocketsKey(userId, deviceId), socketId);

    multi.expire(REDIS_KEYS.userPresence(userId), REDIS_TTL.devicePresence);
    multi.expire(REDIS_KEYS.devicePresence(userId), REDIS_TTL.devicePresence);
    multi.expire(deviceSocketsKey(userId, deviceId), REDIS_TTL.devicePresence);

    await multi.exec();
};

export const markOffline = async (userId, deviceId, socketId) =>{
    const dsKey = deviceSocketsKey(userId, deviceId);

    const results = await redisClient.multi()
        .sRem(REDIS_KEYS.userPresence(userId), socketId)
        .sRem(dsKey, socketId)
        .sCard(dsKey)
        .exec();

    const remainingForDevice = Number(results[2]);

    if (remainingForDevice === 0) {
        await redisClient.sRem(REDIS_KEYS.devicePresence(userId), deviceId);
    }

    return redisClient.sCard(REDIS_KEYS.userPresence(userId));
}

export const isUserOnline = async (userId) =>
    (await redisClient.sCard(REDIS_KEYS.userPresence(userId))) > 0;

export const isDeviceOnline = async (userId, deviceId) =>
    (await redisClient.sIsMember(REDIS_KEYS.devicePresence(userId), deviceId)) === 1;

export const getOnlineDeviceIds = async (userId) =>
    redisClient.sMembers(REDIS_KEYS.devicePresence(userId));

export const joinRooms = async (socket) => {
    const { userId, deviceId } = socket.user;

    socket.join(userRoom(userId));
    socket.join(deviceRoom(userId, deviceId));   // <-- both arguments

    const conversations = await conversationService.listConversations(userId, {
        limit: 500,
        includeMembers: false
    });

    for (const conversation of conversations) {
        socket.join(conversationRoom(conversation._id.toString()));
    }

    return conversations.length;
};