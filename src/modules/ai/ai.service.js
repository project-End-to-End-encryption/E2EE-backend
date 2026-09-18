import {BadRequestException} from "../../shared/errors/domainErrors.js";

class AiService {

    constructor(aiMessageRepository, aiGeminiService) {
        this.aiMessageRepository = aiMessageRepository;
        this.aiGeminiService = aiGeminiService;
    }

    async processMessage(userId, message) {

        if (!userId) {
            throw new BadRequestException(
                "Authenticated user is required."
            );
        }

        if (typeof message !== "string") {
            throw new BadRequestException(
                "AI message must be a string."
            );
        }

        const content = message.trim();

        if (!content) {
            throw new BadRequestException(
                "AI message cannot be empty."
            );
        }

        if (content.length > 10000) {
            throw new BadRequestException(
                "AI message is too long."
            );
        }

        // Save the user's message first
        await this.aiMessageRepository.createMessage({
            userId,
            role: "user",
            content
        });

        // Get recent conversation history
        const previousMessages =
            await this.aiMessageRepository.findRecentByUserId(
                userId,
                20
            );

        // Convert database messages into Gemini format
        const history = [];

        for (const historyMessage of previousMessages) {

            history.push({
                role: historyMessage.role === "assistant"
                    ? "model"
                    : "user",

                parts: [
                    {
                        text: historyMessage.content
                    }
                ]
            });
        }

        // Generate AI response
        const response =
            await this.aiGeminiService.generateResponse(
                history
            );

        // Save AI response
        const savedResponse =
            await this.aiMessageRepository.createMessage({
                userId,
                role: "assistant",
                content: response
            });

        return {
            userMessage: {
                role: "user",
                content
            },

            assistantMessage: {
                role: "assistant",
                content: savedResponse.content,
                createdAt: savedResponse.createdAt
            }
        };
    }
}

export default AiService;