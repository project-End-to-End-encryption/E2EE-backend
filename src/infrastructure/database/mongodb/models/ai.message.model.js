import mongoose from "mongoose";

const aiMessageSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        role: {
            type: String,
            required: true,
            enum: ["user", "assistant"]
        },

        content: {
            type: String,
            required: true,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

aiMessageSchema.index({
    userId: 1,
    createdAt: -1
});

const AiMessage = mongoose.model("AiMessage", aiMessageSchema);

export { AiMessage };