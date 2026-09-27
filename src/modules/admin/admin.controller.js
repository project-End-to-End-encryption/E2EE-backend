class AdminController {

    constructor(adminService) {
        this.adminService = adminService;
    }


    async login(req, res) {

        try {

            const result =
                await this.adminService.login(
                    req.body.email,
                    req.body.password
                );

            res.cookie(
                "adminAccessToken",
                result.accessToken,
                {
                    httpOnly: true,

                    secure:
                        process.env.NODE_ENV === "production",

                    sameSite:
                        process.env.NODE_ENV === "production"
                            ? "none"
                            : "lax",

                    maxAge: 60 * 60 * 1000
                }
            );

            return res.status(200).json({
                success: true,
                message: "Admin login successful.",
                admin: result.admin
            });

        } catch (error) {

            return res.status(401).json({
                success: false,
                message:
                    error?.message ||
                    "Admin login failed."
            });
        }
    }


    async createAccount(req, res) {

        try {

            const result =
                await this.adminService.createUserAccount(
                    req.admin.adminId,
                    req.body
                );

            return res.status(201).json({
                success: true,
                message:
                    "User account created successfully.",

                user: result.user,

                accountType: result.accountType
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                message:
                    error?.message ||
                    "Unable to create user account."
            });
        }
    }


    async changeUserAccountType(req, res) {

        try {

            const result =
                await this.adminService.changeUserAccountType(
                    req.admin.adminId,
                    req.body.userId,
                    req.body.accountType
                );

            return res.status(200).json({
                success: true,
                message:
                    "User account type updated successfully.",
                account: result
            });

        } catch (error) {

            return res.status(400).json({
                success: false,
                message:
                    error?.message ||
                    "Unable to update account type."
            });
        }
    }
}


export default AdminController;