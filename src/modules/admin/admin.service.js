import mongoose from "mongoose";
import bcrypt from "bcrypt";

import {Admin} from "./admin.model.js";
import {AdminAccountType} from "./admin.account.type.model.js";

import MongoAuthRepository
    from "../../repositories/implementations/mongodb/auth/mongo.auth.repository.js";

import MongoUserRepository
    from "../../repositories/implementations/mongodb/user/mongo.user.repository.js";

import {generateAdminAccessToken}
    from "./admin.jwt.service.js";


class AdminService {

    constructor() {
        this.authRepository =
            new MongoAuthRepository();

        this.userRepository =
            new MongoUserRepository();
    }


    async login(email, password) {

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            throw new Error(
                "Email and password are required."
            );
        }

        const normalizedEmail =
            email.trim().toLowerCase();

        /** @type {any} */
        const admin = await Admin
            .where("email")
            .equals(normalizedEmail)
            .select("email hashedPassword isActive")
            .lean()
            .exec();

        if (!admin) {
            throw new Error(
                "Invalid admin credentials."
            );
        }

        if (admin.isActive !== true) {
            throw new Error(
                "Admin account is inactive."
            );
        }

        const passwordMatches =
            await bcrypt.compare(
                password,
                admin.hashedPassword
            );

        if (!passwordMatches) {
            throw new Error(
                "Invalid admin credentials."
            );
        }

        const accessToken =
            generateAdminAccessToken(admin);

        return {
            accessToken,

            admin: {
                id: String(admin._id),
                email: admin.email
            }
        };
    }


    async createUserAccount(adminId, data) {

        const {
            email,
            password,
            username,
            fullName,
            userBio
        } = data;


        if (
            typeof email !== "string" ||
            typeof password !== "string" ||
            typeof username !== "string"
        ) {
            throw new Error(
                "Email, password and username are required."
            );
        }


        const normalizedEmail =
            email.trim().toLowerCase();

        const normalizedUsername =
            username.trim().toLowerCase();


        if (!normalizedEmail) {
            throw new Error(
                "Email cannot be empty."
            );
        }

        if (!normalizedUsername) {
            throw new Error(
                "Username cannot be empty."
            );
        }

        if (!password.trim()) {
            throw new Error(
                "Password cannot be empty."
            );
        }


        /*
         * Check whether username already exists.
         */

        const existingUser =
            await this.userRepository.findByUsername(
                normalizedUsername
            );

        if (existingUser) {
            throw new Error(
                "Username is already taken."
            );
        }


        /*
         * Check whether email already exists.
         */

        const existingAuth =
            await this.authRepository.findByEmail(
                normalizedEmail
            );

        if (existingAuth) {
            throw new Error(
                "An account with this email already exists."
            );
        }


        /*
         * Hash the password using the
         * same bcrypt cost as normal registration.
         */

        const hashedPassword =
            await bcrypt.hash(password, 12);


        /*
         * Create Auth + User atomically.
         */

        const session =
            await mongoose.startSession();

        let newAuth;
        let newUser;

        try {

            session.startTransaction();


            newAuth =
                await this.authRepository.createAuth(
                    {
                        email: normalizedEmail,
                        hashedPassword,
                        provider: "local"
                    },
                    session
                );


            newUser =
                await this.userRepository.createUser(
                    {
                        username: normalizedUsername,
                        fullName,
                        userBio,
                        authId: newAuth._id,
                        accountStatus: "active"
                    },
                    session
                );


            await session.commitTransaction();

        } catch (error) {

            await session.abortTransaction();

            throw error;

        } finally {

            await session.endSession();
        }


        /*
         * Create the account-type record.
         *
         * This is kept separate from the User model,
         * so your existing User model remains unchanged.
         */

        const accountType =
            new AdminAccountType({
                userId: newUser._id,
                accountType: "user",
                updatedBy: adminId
            });

        await accountType.save();


        return {
            user: {
                id: newUser._id,
                username: newUser.username,
                email: newAuth.email,
                fullName: newUser.fullName,
                userBio: newUser.userBio,
                accountStatus: newUser.accountStatus
            },

            accountType: accountType.accountType
        };
    }


    async changeUserAccountType(
        adminId,
        userId,
        accountType
    ) {

        const allowedTypes = [
            "user",
            "admin",
            "moderator",
            "manager"
        ];


        if (!allowedTypes.includes(accountType)) {
            throw new Error(
                "Invalid account type."
            );
        }


        const user =
            await this.userRepository.findByUserId(
                userId
            );

        if (!user) {
            throw new Error(
                "User not found."
            );
        }


        /** @type {any} */
        let accountTypeRecord =
            await AdminAccountType
                .where("userId")
                .equals(userId)
                .exec();


        if (accountTypeRecord) {

            accountTypeRecord.accountType =
                accountType;

            accountTypeRecord.updatedBy =
                adminId;

        } else {

            accountTypeRecord =
                new AdminAccountType({
                    userId,
                    accountType,
                    updatedBy: adminId
                });
        }


        await accountTypeRecord.save();


        return {
            userId: String(userId),
            accountType:
            accountTypeRecord.accountType
        };
    }
}


export default AdminService;