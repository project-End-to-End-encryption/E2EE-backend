import cookie from 'cookie';
import {verifyAccessToken} from "../../shared/utils/jwt.js";

const DEVICE_ID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;
export const authenticateSocket = (socket, next) => {
    try{
        const cookies = cookie.parse(socket.handshake.headers.cookie || '');
        const token = cookies.accessToken || socket.handshake.auth?.token;

        if(!token){
            return next(new Error('TOKEN_REQUIRED'));
        }

        const decoded = verifyAccessToken(token);

        const userId = decoded.userId || decoded.sub;
        if (!userId) return next(new Error('INVALID_TOKEN'));

        const deviceId = socket.handshake.auth?.deviceId;
        if (!deviceId) return next(new Error('DEVICE_ID_REQUIRED'));
        if (!DEVICE_ID_PATTERN.test(deviceId)) return next(new Error('INVALID_DEVICE_ID'));

        socket.user = {
            userId: String(userId),
            authId: decoded.authId ? String(decoded.authId) : null,
            deviceId
        };

        next();
    } catch (error){
        if(error.name === 'TokenExpiredError'){
            return next(new Error('TOKEN_EXPIRED'));
        }
        return next(new Error('INVALID_TOKEN'));
    }
};