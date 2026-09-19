import {AiMessage} from "../../../../infrastructure/database/mongodb/models/ai.message.model.js";

class MongoAiMessageRepository {

    async createMessage(messageData) {
        const message = new AiMessage(messageData);

        return await message.save();
    }

    async findRecentByUserId(userId, limit = 20) {

        const messages = await AiMessage
            .where("userId")
            .equals(userId)
            .select("role content createdAt -_id")
            .sort("-createdAt")
            .limit(limit)
            .lean()
            .exec();

        return Array.from(messages).reverse();
    }
}

export default MongoAiMessageRepository;