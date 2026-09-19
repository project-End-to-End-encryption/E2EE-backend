import { GoogleGenAI } from "@google/genai";
import aiConfig from "../../config/ai.config.js";
import { getSystemPrompt } from "./ai.prompt.js";

class AiGeminiService {

    constructor() {
        this.client = new GoogleGenAI({
            apiKey: aiConfig.apiKey
        });
    }

    async generateResponse(history) {

        const systemPrompt = await getSystemPrompt();

        const response = await this.client.models.generateContent({
            model: aiConfig.model,

            contents: history,

            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: aiConfig.generation.maxOutputTokens,
                temperature: aiConfig.generation.temperature
            }
        });

        const text = response.text;

        if (typeof text !== "string" || !text.trim()) {
            throw new Error("Gemini returned an empty response.");
        }

        return text.trim();
    }
}

export default AiGeminiService;