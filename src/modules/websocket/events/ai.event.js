import MongoAiMessageRepository
    from "../../../repositories/implementations/mongodb/ai/mongo.ai.message.repository.js";

import AiGeminiService
    from "../../ai/ai.gemini.service.js";

import AiService
    from "../../ai/ai.service.js";

import AiController
    from "../../ai/ai.controller.js";

const aiMessageRepository =
    new MongoAiMessageRepository();

const aiGeminiService =
    new AiGeminiService();

const aiService =
    new AiService(
        aiMessageRepository,
        aiGeminiService
    );

const aiController =
    new AiController(aiService);


export const registerAiEvent = (io, socket) => {

    socket.on("ai:message", async (data, acknowledgement) => {

        try {

            const userId = socket.user.userId;

            const result =
                await aiController.handleMessage(
                    userId,
                    data
                );

            socket.emit("ai:response", {
                success: true,
                message: result.assistantMessage
            });

            if (typeof acknowledgement === "function") {
                acknowledgement({
                    success: true
                });
            }

        } catch (error) {

            console.error(
                "AI WebSocket error:",
                error
            );

            socket.emit("ai:error", {
                success: false,
                message:
                    error?.message ||
                    "Unable to process AI request."
            });

            if (typeof acknowledgement === "function") {
                acknowledgement({
                    success: false,
                    message:
                        error?.message ||
                        "Unable to process AI request."
                });
            }
        }
    });
};