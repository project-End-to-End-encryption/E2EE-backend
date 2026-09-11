import cookie from 'cookie';
import {verifyAccessToken} from "../../shared/utils/jwt.js";

export const authenticateSocket = (socket, next) => {
    try{
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies.accessToken || socket.handshake.auth?.token;

        if(!token){
            return next(new Error('TOKEN_REQUIRED'));
        }

        socket.user = verifyAccessToken(token);

        next();
    } catch (error){
        if(error.name === 'TokenExpiredError'){
            return next(new Error('TOKEN_EXPIRED'));
        }
        return next(new Error('INVALID_TOKEN'));
    }
};