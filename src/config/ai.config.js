import env from "./env.js";

const aiConfig = {
    provider: "gemini",

    apiKey: env.geminiApiKey,

    model: env.geminiModel,

    generation: {
        maxOutputTokens: 2000,
        temperature: 0.7
    }
};

export default aiConfig;