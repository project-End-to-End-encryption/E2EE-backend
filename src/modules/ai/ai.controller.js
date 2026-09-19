class AiController {

    constructor(aiService) {
        this.aiService = aiService;
    }

    async handleMessage(userId, data) {
        return this.aiService.processMessage(
            userId,
            data?.message
        );
    }
}

export default AiController;