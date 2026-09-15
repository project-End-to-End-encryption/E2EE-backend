class IConversationRepository {
    async createGroup(data) {
        throw new Error("Method not implemented.");
    }

    /** Idempotent: returns the existing direct chat if one is already there. */
    async findOrCreateDirect(userIdA, userIdB) {
        throw new Error("Method not implemented.");
    }

    async findById(conversationId) {
        throw new Error("Method not implemented.");
    }

    async findByUserId(userId, options) {
        throw new Error("Method not implemented.");
    }

    async isMember(conversationId, userId) {
        throw new Error("Method not implemented.");
    }

    async addMember(conversationId, userId, role) {
        throw new Error("Method not implemented.");
    }

    async removeMember(conversationId, userId) {
        throw new Error("Method not implemented.");
    }

    /** Atomically ++lastSeq and stamp lastMessageAt. Returns the new seq. */
    async reserveSeq(conversationId, sentAt) {
        throw new Error("Method not implemented.");
    }

    async bumpKeyEpoch(conversationId) {
        throw new Error("Method not implemented.");
    }
}

export default IConversationRepository;