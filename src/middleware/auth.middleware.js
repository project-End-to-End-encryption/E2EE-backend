import {verifyAccessToken} from '../shared/utils/jwt.js'
import {InvalidTokenException} from "../shared/errors/domainErrors.js";

export const authenticate = (req,res,next) => {

    const token = req.cookie?.accessToken;

    if(!token){
        return next(new InvalidTokenException('Authentication token required','TOKEN_REQUIRED'));
    }

    try{
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error){
        if (error.name === 'TokenExpiredError') {
            return next(new InvalidTokenException('Access token has expired', 'TOKEN_EXPIRED'));
        }
        return next(new InvalidTokenException('Invalid access token', 'INVALID_TOKEN'));
    }
};