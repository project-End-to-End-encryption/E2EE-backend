import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";

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
