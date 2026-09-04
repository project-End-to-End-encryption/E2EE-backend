import {verifyAccessToken} from '../shared/utils/jwt.js'

export const authenticate = (req,res,next) => {
    const authHeader = req.headers.authorization;

    if(!authHeader || !authHeader.startsWith('Bearer ')){
        return res.status(401).json({message: 'Authentication token required'});
    }

    const token = authHeader.split(' ')[1];

    try{
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    } catch (error){
        if(error.name === 'TokenExpiredError'){
            return res.status(401).json({
                code: 'TOKEN_EXPIRED',
                message: 'Access token has expired'
            });
        }
        return res.status(401).json({code: 'INVALID_TOKEN', message: 'Invalid access token'});
    }
};