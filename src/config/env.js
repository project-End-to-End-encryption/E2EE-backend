import dotenv from "dotenv";

dotenv.config();

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!geminiApiKey) {
    throw new Error(
        "Missing required environment variable: GEMINI_API_KEY"
    );
}

const env = {
    port: process.env.PORT || 5000,
    geminiApiKey,
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    nodeEnv: process.env.NODE_ENV || "development"
};

export default env;