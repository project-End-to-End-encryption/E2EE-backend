import jwt from "jsonwebtoken";

const getAdminJwtSecret = () => {

    const secret = process.env.ADMIN_JWT_ACCESS_SECRET;

    if (!secret) {
        throw new Error(
            "ADMIN_JWT_ACCESS_SECRET is not configured."
        );
    }

    return secret;
};

export const generateAdminAccessToken = (admin) => {

    return jwt.sign(
        {
            adminId: admin._id.toString(),
            role: "admin",
        },
        getAdminJwtSecret(),
        {
            expiresIn:
                process.env.ADMIN_JWT_ACCESS_TOKEN_EXPIRY || "1h",

            algorithm: "HS256",
        }
    );
};

export const verifyAdminAccessToken = (token) => {

    return jwt.verify(
        token,
        getAdminJwtSecret(),
        {
            algorithms: ["HS256"],
        }
    );
};