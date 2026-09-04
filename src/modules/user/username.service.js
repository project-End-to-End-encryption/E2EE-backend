import {connectRedis} from '../../config/redis.config.js'
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {ConflictException} from "../../shared/errors/domainErrors.js";
import userRepository from "../../repositories/interfaces/user.repository.js";

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

        const redis = await connectRedis();
        const lockKey = REDIS_KEYS.usernameLock(normalizedUsername);

        const acquired = await redis.set(lockKey, 'locked', {
            EX: 900,
            NX: true
        });

        if(!acquired){
            throw new ConflictException('Username is currently reserved by another user');
        }
        return {
            username: `@${normalizedUsername}`,
            reserved: true,
            expiresInSeconds: 900,
        };
    }
}

export default UsernameService;