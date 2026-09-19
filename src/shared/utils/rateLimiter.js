// Fixed-window counter in Redis
// by this any user cannot mis-behave with our server

import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS} from "../constants/redisKeys.js";

export const consumeTokens = async (bucket, identity, {limit, windowSeconds}) => {
    const key = REDIS_KEYS.rateLimit(bucket,identity);

    try{
        const result = await redisClient.eval(
            `
            local count = redis.call('INCR', KEYS[1])

            if count == 1 then
                redis.call('EXPIRE', KEYS[1], ARGV[1])
            end

            local ttl = redis.call('TTL', KEYS[1])

            return { count, ttl }
            `,{
                keys: [key],
                arguments: [String(windowSeconds)]
            }
        );

        const count = Number(result[0]);
        const ttl = Number(result[1]);

        return {
            allowed: count <= limit,
            remaining: Math.max(0, limit - count),
            retryAfter: ttl > 0 ? ttl : windowSeconds
        };
    } catch(error){
        console.error('[rateLimiter] redis failure, failing open:', error.message);
        return { allowed: true, remaining: limit, retryAfter: 0 };
    }
}
export const RATE_LIMITS = {
    messageSend:   { limit: 120, windowSeconds: 60 },  // 2 sec sustained
    keyFetch:      { limit: 240, windowSeconds: 60 },  // bursts on group key setup
    conversation:  { limit: 60,  windowSeconds: 60 },
    syncPull:      { limit: 60,  windowSeconds: 60 },
    receipts:      { limit: 600, windowSeconds: 60 },  // cheap, high volume
    typing:        { limit: 600, windowSeconds: 60 },
    userSearch:    { limit: 90,  windowSeconds: 60 },  // debounced client, still bounded
    media:         { limit: 120, windowSeconds: 60 }   // one grant per attachment
};

// Wraps a socket handler with a rate-limit check.
// currently setup as per account
export const withRateLimit = (bucket, config, identity, handler) => {
    return async (payload, ack) => {
        const result = await consumeTokens(bucket, identity || 'anon', config);

        if(!result.allowed){
            return ack({ok: false, error: 'RATE_LIMIT', retryAfter: result.retryAfter});
        }
        try{
            return await handler(payload, ack);
        } catch (error){
            console.log(`[socket:${bucket}] handle failed:`, error);
            return ack?.({ok: false, error: error.errorCode || error.errorMessage || 'INTERNAL_ERROR'});
        }
    };
};