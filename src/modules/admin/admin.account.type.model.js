import mongoose from "mongoose";

const adminAccountTypeSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true,
        },

        accountType: {
            type: String,
            required: true,
            enum: [
                "user",
                "admin",
                "moderator",
                "manager"
            ],
            default: "user",
        },

        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Admin",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const AdminAccountType = mongoose.model(
    "AdminAccountType",
    adminAccountTypeSchema
);

export { AdminAccountType };