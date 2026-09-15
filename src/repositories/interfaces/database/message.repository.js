class IMessageRepository {
    async insert(message) {
        throw new Error("Method not implemented.");
    }

    async findByClientId(conversationId, clientMessageId) {
        throw new Error("Method not implemented.");
    }

    /** Cursor page, newest first. */
    async findPage(conversationId, { beforeSeq, afterSeq, limit, userId }) {
        throw new Error("Method not implemented.");
    }

    async findBySeqRange(conversationId, fromSeq, toSeq, userId) {
        throw new Error("Method not implemented.");
    }

    async hideForUser(messageId, userId) {
        throw new Error("Method not implemented.");
    }

    async revoke(messageId, senderId) {
        throw new Error("Method not implemented.");
    }

    async deleteByConversation(conversationId) {
        throw new Error("Method not implemented.");
    }
}
export default IMessageRepository;