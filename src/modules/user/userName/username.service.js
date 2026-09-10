import redisClient from "../../../config/redis.config.js";
import {REDIS_KEYS} from "../../../shared/constants/redisKeys.js";
import {ConflictException} from "../../../shared/errors/domainErrors.js";
import crypto from 'crypto';


class UsernameService{
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async checkAndReserveUsername(username){
        const normalizedUsername = username.toLowerCase().trim();

        const existingUsername = await this.userRepository.findByUsername(normalizedUsername);
        if(existingUsername){
            throw new ConflictException("Username is already taken");
        }

        const redis = redisClient;

        const reservationId = crypto.randomUUID();

        const lockKey = REDIS_KEYS.usernameReservation(normalizedUsername);
        const idKey = REDIS_KEYS.usernameReservationById(reservationId);


        const acquired = await redis.set(lockKey, JSON.stringify({
            reservationId,
            username: normalizedUsername
        }), {
            EX: 900,
            NX: true
        });


        if (acquired === null) {
            // someone already holds an active reservation on this username
            throw new ConflictException("Username is currently reserved, try again in a few minutes");
        }


        await redis.set(idKey, JSON.stringify({
            username: normalizedUsername
        }), {
            EX: 900
        });

        return {
            username: `@${normalizedUsername}`,
            reservationId,
            reserved: true,
            expiresInSeconds: 900,
        };
    }
}

export default UsernameService;