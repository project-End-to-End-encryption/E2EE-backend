const jwtConfig = {
    secret: process.env.JWT_SECRET,

    accessTokenExpiry: process.env.JWT_ACCESS_TOKEN_EXPIRY,

    refreshTokenExpiry: process.env.JWT_REFRESH_TOKEN_EXPIRY,

    algorithm: "HS256",
};

module.exports = jwtConfig;