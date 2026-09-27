import {verifyAdminAccessToken} from "./admin.jwt.service.js";
import {Admin} from "./admin.model.js";

export const adminAuthMiddleware = async (req, res, next) => {

    try {

        const token = req.cookies?.adminAccessToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Admin authentication required."
            });
        }

        const payload =
            verifyAdminAccessToken(token);

        if (!payload || !payload.adminId) {
            return res.status(401).json({
                success: false,
                message: "Invalid admin token."
            });
        }

        /** @type {any} */
        const admin = await Admin
            .where("_id")
            .equals(payload.adminId)
            .select("email isActive")
            .lean()
            .exec();

        if (!admin) {
            return res.status(403).json({
                success: false,
                message: "Admin access denied."
            });
        }

        if (admin.isActive !== true) {
            return res.status(403).json({
                success: false,
                message: "Admin account is inactive."
            });
        }

        req.admin = {
            adminId: String(payload.adminId),
            email: admin.email,
            role: "admin"
        };

        next();

    } catch (error) {

        if (error?.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Admin access token expired."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid admin access token."
        });
    }
};