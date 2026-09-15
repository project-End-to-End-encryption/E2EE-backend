class IConversationKeyRepository {
    async upsert(row) {
        throw new Error("Method not implemented.");
    }

    async findForUser(conversationId, userId) {
        throw new Error("Method not implemented.");
    }

    async listForUser(userId, { sinceId, limit }) {
        throw new Error("Method not implemented.");
    }

    async deleteAllForUser(userId) {
        throw new Error("Method not implemented.");
    }

    async countForConversation(conversationId) {
        throw new Error("Method not implemented.");
    }
}

export default IConversationKeyRepository;