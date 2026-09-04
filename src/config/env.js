import dotenv from "dotenv";

dotenv.config();

const requiredEnv = [
    "GEMINI_API_KEY"
];

for (const key of requiredEnv) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}

const env = {
    port: process.env.PORT || 5000,
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    nodeEnv: process.env.NODE_ENV || "development"
};

export default env;