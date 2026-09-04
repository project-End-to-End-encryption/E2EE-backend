import jwt from 'jsonwebtoken'
import jwtConfig from "../../config/jwt.config.js";

export const generateAccessToken = (payload)=>{
    return jwt.sign(payload, jwtConfig.accessSecret,{
        expiresIn: jwtConfig.accessTokenExpiry,
        algorithm: jwtConfig.algorithm
    });
};

export const generateRefreshToken = (payload)=>{
    return jwt.sign(payload, jwtConfig.refreshSecret,{
        expiresIn: jwtConfig.refreshTokenExpiry,
        algorithm: jwtConfig.algorithm
    });
};

export const generateAuthTokens = (payload)=>{
    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken({authId: payload.authId})

    return {accessToken, refreshToken};
}

export const verifyAccessToken = (token)=>{
        return jwt.verify(token, jwtConfig.accessSecret);
};

export const verifyRefreshToken = (token) =>{
        return jwt.verify(token, jwtConfig.refreshSecret);
};