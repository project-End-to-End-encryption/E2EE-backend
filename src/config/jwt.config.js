import dotenv from 'dotenv'
dotenv.config()
const jwtConfig = {
    accessSecret: process.env.JWT_ACCESS_SECRET,

    refreshSecret: process.env.JWT_REFRESH_SECREAT,

    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY,

    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY,

    algorithm: "HS256",
};

export default jwtConfig;