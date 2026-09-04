import mongoose from "mongoose";
import bcrypt from 'bcryptjs'
import {connectRedis} from "../../config/redis.config.js";
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {ConflictException} from "../../shared/errors/domainErrors.js";
import {generateAuthTokens} from "../../shared/utils/jwt.js";

class AuthService{
    constructor(userRepository, authRepository) {
        this.userRepository = userRepository;
        this.authRepository = authRepository;
    }

    async register({username, email, password}){
        const normalizedUsername = username.toLowerCase().trim();
        const normalizedEmail = email.toLowerCase().trim();

        const existingUser = await this.userRepository.findByUsername(normalizedUsername);
        if(existingUser){
            throw new ConflictException('UserName is already taken');
        }

        const existingAuth = await this.authRepository.findByEmail(normalizedEmail);
        if (existingAuth) {
            throw new ConflictException('An account with this email already exists');
        }

        const hashedPassword = await bcrypt.hash(password,12);

        const session = await mongoose.startSession();
        session.startTransaction();

        let newUser;
        let newAuth;
        try{
            newUser = await this.userRepository.createUser({
                username: normalizedUsername, session
            });
            newAuth = await this.authRepository.createAuth(
                {
                    userId: newUser._id,
                    email: normalizedEmail,
                    hashedPassword,
                    provider: 'local',
                },
                session
            );

            await session.commitTransaction();
            session.endSession();
        } catch (error){
            await session.abortTransaction();
            session.endSession();
            throw error;
        }

        const redis = await connectRedis();
        const lockKey = REDIS_KEYS.usernameLock(normalizedUsername);
        await redis.del(lockKey);

        const token =  generateAuthTokens({
            userId: newUser._id,
            authId: newAuth._id,
            email: newAuth.email
        });
        return {
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newAuth.email
            },
            ...token
        };
    }
}