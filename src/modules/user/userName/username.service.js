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
        const reservationKey = REDIS_KEYS.usernameReservation(reservationId);

        await redis.set(reservationKey, JSON.stringify({
            username: normalizedUsername
        }), {
            EX: 900,
            NX: true
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