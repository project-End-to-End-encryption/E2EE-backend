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

        const reservationId = crypto.randomUUID();

        const lockKey = REDIS_KEYS.usernameReservation(normalizedUsername);
        const idKey = REDIS_KEYS.usernameReservationById(reservationId);

        const reservationData = JSON.stringify({
            reservationId,
            username: normalizedUsername
        });

        const idData = JSON.stringify({
            username: normalizedUsername
        });


        // Lua script to prevent race condition
        const script = `
        if redis.call("EXISTS", KEYS[1]) == 1 then
            return 0
        end

        redis.call(
            "SET",
            KEYS[1],
            ARGV[1],
            "EX",
            ARGV[3]
        )

        redis.call(
            "SET",
            KEYS[2],
            ARGV[2],
            "EX",
            ARGV[3]
        )

        return 1
    `;

        const result = await redisClient.eval(script, {
            keys: [lockKey, idKey],
            arguments: [
                reservationData,
                idData,
                "900"
            ]
        });


        if (result === 0) {
            // someone already holds an active reservation on this username
            throw new ConflictException("Username is currently reserved, try again in a few minutes");
        }


        return {
            username: `@${normalizedUsername}`,
            reservationId,
            reserved: true,
            expiresInSeconds: 900,
        };
    }
}

export default UsernameService;