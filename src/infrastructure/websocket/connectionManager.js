import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {userRoom, deviceRoom, groupRoom} from "../../shared/utils/socketRooms.js";
import {getUserGroups} from '../../modules/messaging/group.service.js'

export const markOnline = (userId, socketId) =>
    redisClient.sAdd(REDIS_KEYS.userPresence(userId),socketId);

export const markOffline = async (userId, socketId) =>{
    const key = REDIS_KEYS.userPresence(userId);
    await redisClient.sRem(key,socketId);
    return redisClient.sCard(key);
}

export const isUserOnline = async (userId) =>
    (await redisClient.sCard(REDIS_KEYS.userPresence(userId))) > 0;

// need to add heartbeat


export const joinRoom = async (socket) => {
    const {userId, deviceId} = socket.user;

    socket.join(userRoom(userId));

    if(deviceId) socket.join(deviceRoom(userId,deviceId));

    const groups = await getUserGroups(userId);
    groups.forEach(g => socket.join(groupRoom(g._id.toString())));
};