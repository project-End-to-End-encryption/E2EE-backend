import {asyncHandler} from "../../shared/utils/asyncHandler.js";
import MongoUserRepository from "../../repositories/implementations/mongodb/mongo.user.repository.js";
import MongoAuthRepository from "../../repositories/implementations/mongodb/mongo.auth.repository.js";
import AuthService from "./auth.service.js";
import {CreateResponse, SuccessResponse} from "../../shared/utils/response.js";
import MongoSessionRepository from "../../repositories/implementations/mongodb/mongo.session.repository.js";
import {InvalidTokenException} from "../../shared/errors/domainErrors.js";

const userRepository = new MongoUserRepository();
const authRepository = new MongoAuthRepository();
const sessionRepository = new MongoSessionRepository();
const authService = new AuthService(userRepository,authRepository,sessionRepository);


const isProduction = process.env.NODE_ENV === 'prod';

const cookieOption = {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
};

export const register = asyncHandler(async (req,res) =>{
    const {reservationId, email, password } = req.body;

    const {user, accessToken, refreshToken, sessionId } =
        await authService.register({
            reservationId,
            email,
            password},
            req.headers['user-agent']
        );



    res.cookie('accessToken', accessToken,{
        ...cookieOption,
        maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken,{
        ...cookieOption,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.cookie('sessionId', sessionId,{
        ...cookieOption,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json(
        new CreateResponse(
            'Account created successfully',
            {
                debugTokens:{
                    accessToken: accessToken,
                    refreshToken: refreshToken,
                    sessionId: sessionId
                }
            }
        )
    );
});

export const login = asyncHandler(async (req,res) =>{
    const {email, password} = req.body;

    const {user, accessToken, refreshToken, sessionId} =
        await authService.login({email,password},req.headers['user-agent']);

    res.cookie('accessToken', accessToken,{
        ...cookieOption, maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken,{
        ...cookieOption, maxAge: 7 * 24 * 60 * 60 * 1000
    });
    res.cookie('sessionId', sessionId,{
        ...cookieOption, maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json(
        new SuccessResponse('Logged in successfully',{
            debugTokens: {
                accessToken,
                refreshToken,
                sessionId
            }
        })
    );
})

export const logout = asyncHandler(async (req,res) =>{
    const {sessionId} = req.cookies;

    await authService.logout(sessionId);

    res.clearCookie('accessToken', cookieOption);
    res.clearCookie('refreshToken', cookieOption);
    res.clearCookie('sessionId', cookieOption);

    res.status(200).json(new SuccessResponse('Logged out successfully', null));
});

export const refreshToken = asyncHandler(async (req,res) => {
    const {refreshToken, sessionId} = req.cookies;

    if(!refreshToken || !sessionId){
        throw new InvalidTokenException('Refresh token required', 'REFRESH_TOKEN_REQUIRED');
    }

    const {accessToken} = await authService.refreshAccessToken(refreshToken,sessionId);

    res.cookie('accessToken', accessToken, {...cookieOption, maxAge: 15 * 60 * 1000});

    res.status(200).json(new SuccessResponse('Access token refresh', null));
})

// cookie path set up will be done later