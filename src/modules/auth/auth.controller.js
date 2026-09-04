import {asyncHandler} from "../../shared/utils/asyncHandler.js";
import MongoUserRepository from "../../repositories/implementations/mongodb/mongo.user.repository.js";
import MongoAuthRepository from "../../repositories/implementations/mongodb/mongo.auth.repository.js";
import AuthService from "./auth.service.js";


const userRepository = new MongoUserRepository();
const authRepository = new MongoAuthRepository();
const authService = new AuthService(userRepository,authRepository);

export const register = asyncHandler(async (req,res) =>{
    const {reservationId, email, password } = req.body;

    const {user, accessToken, refreshToken } =
        await authService.register({reservationId,email,password});

    const isProduction = process.env.NODE_ENV === 'prod';

    const cookieOption = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict',
    };

    res.cookie('accessToken', accessToken,{
        ...cookieOption,
        maxAge: 15 * 60 * 1000
    });

    res.cookie('refreshToken', refreshToken,{
        ...cookieOption,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data:{
            debugTokens:{
                accessToken: accessToken,
                refreshToken: refreshToken
            }
        }
    });
});