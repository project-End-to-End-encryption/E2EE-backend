import mongoose from "mongoose";
import bcrypt from 'bcryptjs'
import {connectRedis} from "../../config/redis.config.js";
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {ConflictException, BadRequestException} from "../../shared/errors/domainErrors.js";
import {generateAuthTokens} from "../../shared/utils/jwt.js";

class AuthService{
    constructor(userRepository, authRepository) {
        this.userRepository = userRepository;
        this.authRepository = authRepository;
    }
    async register({reservationId, email, password}){
        const redis = await connectRedis();
        const reservationKey = REDIS_KEYS.usernameReservation(reservationId)
        const reservationData = await redis.get(reservationKey);

        if (!reservationData) {
            throw new BadRequestException(
                "Username reservation is invalid or has expired"
            );
        }
        const { username } = JSON.parse(reservationData);

        const existingUser = await this.userRepository.findByUsername(username);

        if(existingUser){
            throw new ConflictException('UserName is already taken');
        }
        const normalizedEmail = email.toLowerCase().trim();
        const existingAuth = await this.authRepository.findByEmail(normalizedEmail);
        if (existingAuth) {
            throw new ConflictException('An account with this email already exists');
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const session = await mongoose.startSession();
        let newUser;
        let newAuth;
        try{
            session.startTransaction();
            newAuth = await this.authRepository.createAuth(
                {
                    email: normalizedEmail,
                    hashedPassword,
                    provider: 'local',
                },
                session
            );
            newUser = await this.userRepository.createUser({
                username, authId: newAuth._id, session
            });

            await session.commitTransaction();

        } catch (error){
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession()
        }
        await redis.del(reservationKey);
        const token =  await generateAuthTokens({
            userId: newUser._id,
            authId: newAuth._id,
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
export default AuthService;