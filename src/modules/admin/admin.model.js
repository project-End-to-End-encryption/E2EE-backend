import mongoose from "mongoose";

const adminSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },

        hashedPassword: {
            type: String,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

const Admin = mongoose.model("Admin", adminSchema);

export { Admin };