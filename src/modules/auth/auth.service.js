import mongoose from "mongoose";
import bcrypt from 'bcrypt'
import crypto from "crypto";
import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS} from "../../shared/constants/redisKeys.js";
import {
    ConflictException,
    BadRequestException,
    UnauthorizedException,
    InvalidTokenException
} from "../../shared/errors/domainErrors.js";
import {
    compareRefreshToken,
    generateAccessToken,
    generateAuthTokens,
    verifyRefreshToken
} from "../../shared/utils/jwt.js";
import {getDeviceInfo} from "../../shared/utils/deviceInfo.js";

class AuthService{
    constructor(userRepository, authRepository, sessionRepository) {
        this.userRepository = userRepository;
        this.authRepository = authRepository;
        this.sessionRepository = sessionRepository;
    }
    async register({reservationId, email, password}, userAgent){
        const redis = redisClient
        const idKey = REDIS_KEYS.usernameReservationById(reservationId);
        const reservationData = await redis.get(idKey);

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
            newUser = await this.userRepository.createUser(
            {username, authId: newAuth._id}, session
            );

            await session.commitTransaction();

        } catch (error){
            await session.abortTransaction();
            throw error;
        } finally {
            await session.endSession()
        }
        await redis.del(idKey);
        await redis.del(REDIS_KEYS.usernameReservation(username));
        const token =  await generateAuthTokens({
            userId: newUser._id,
            authId: newAuth._id,
        });
        const sessionId = crypto.randomBytes(32).toString('hex');
        const hashedRefreshToken = await bcrypt.hash(
            token.refreshToken,
            12
        )
        await this.sessionRepository.createSession({
            sessionId,
            userId: newUser._id,
            hashedRefreshToken,

            device: getDeviceInfo(userAgent),

            isActive: true,
            lastActive: new Date(),

            expiresAt: new Date(
                Date.now() + 7 * 24 * 60 * 60 * 1000
            )
        });
        return {
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newAuth.email
            },
            ...token,
            sessionId
        };
    }

    async login({email, password}, userAgent){
        const normaliseEmail = email.toLowerCase().trim();

        const auth = await this.authRepository.findByEmail(normaliseEmail);

        const invalidCredentials = () =>
            new UnauthorizedException('Invalid email or password');


        if(!auth || auth.provider !== 'local'){
            throw invalidCredentials();
        }

        const passwordMatches = await bcrypt.compare(password, auth.hashedPassword);

        if(!passwordMatches){
            throw invalidCredentials();
        }

        const user = await this.userRepository.findByAuthId(auth._id);
        if(!user){
            throw invalidCredentials();
        }

        const token = await generateAuthTokens({
            userId: user._id,
            authId: auth._id
        });

        const sessionId = crypto.randomBytes(32).toString('hex');
        const hashedRefreshToken = await bcrypt.hash(token.refreshToken, 12);

        await this.sessionRepository.createSession({
            sessionId,
            userId: user._id,
            hashedRefreshToken,
            device: getDeviceInfo(userAgent),
            isActive: true,
            lastActive: new Date(),
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        });

        return {
            user: {
                id: user._id,
                username: user.username,
                email: auth.email
            },
            ...token,
            sessionId
        };
    }

    async logout(sessionId){
        if(sessionId){
            await this.sessionRepository.deleteSession(sessionId);
        }
    }

    async refreshAccessToken(refreshToken, sessionId){
        let decoded;
        try{
            decoded = verifyRefreshToken(refreshToken);
        } catch (error){
            if(error.name === 'TokenExpiredError'){
                throw new InvalidTokenException('Refresh token has expire', 'REFRESH_TOKEN_EXPIRED');
            }
            throw new InvalidTokenException('Invalid refresh token', 'INVALID_REFRESH_TOKEN');
        }

        const session = await this.sessionRepository.findBySessionId(sessionId);
        if(!session){
            throw new InvalidTokenException('Session not found', 'SESSION_INVALID');
        }
        const isMatch = await compareRefreshToken(refreshToken, session.hashedRefreshToken);
        if(!isMatch){
            throw new InvalidTokenException('Refresh token reuse detected', 'SESSION_INVALID')
        }
        const user = await this.userRepository.findByAuthId(decoded.authId);

        if (!user) {
            throw new InvalidTokenException(
                'User not found',
                'USER_INVALID'
            );
        }

        const accessToken = generateAccessToken({userId: user._id, authId: decoded.authId});

        return {accessToken};
    }
}
export default AuthService;