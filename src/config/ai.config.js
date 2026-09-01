const { geminiApiKey } = require("./env");

const aiConfig = {
    provider: "gemini",

    apiKey: geminiApiKey,

    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",

    generation: {
        maxOutputTokens: 2000,
        temperature: 0.7
    }
};

module.exports = aiConfig;