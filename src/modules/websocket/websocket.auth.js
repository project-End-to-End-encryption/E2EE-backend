import cookie from 'cookie';
import {verifyAccessToken} from "../../shared/utils/jwt.js";

export const authenticateSocket = (socket, next) => {
    try{
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');

        if(!cookies.accessToken){
            return next(new Error('TOKEN_REQUIRED'));
        }

        socket.user = verifyAccessToken(cookies.accessToken);

        next();
    } catch (error){
        if(error.name === 'TokenExpiredError'){
            return next(new Error('TOKEN_EXPIRED'));
        }
        return next(new Error('INVALID_TOKEN'));
    }
};