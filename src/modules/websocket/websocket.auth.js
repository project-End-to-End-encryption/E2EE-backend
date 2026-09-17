import cookie from 'cookie';
import {verifyAccessToken} from "../../shared/utils/jwt.js";

export const authenticateSocket = (socket, next) => {
    try{
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies.accessToken || socket.handshake.auth?.token;

        if(!token){
            return next(new Error('TOKEN_REQUIRED'));
        }

        const decoded = verifyAccessToken(token);

        const userId = decoded.userId || decoded.sub;

        socket.user = {
            userId,
            deviceId: socket.handshake.auth?.deviceId
        };

        next();
    } catch (error){
        if(error.name === 'TokenExpiredError'){
            return next(new Error('TOKEN_EXPIRED'));
        }
        return next(new Error('INVALID_TOKEN'));
    }
};