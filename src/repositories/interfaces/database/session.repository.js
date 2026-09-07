class SessionRepository{
    async createSession(sessionData){
        throw new Error("Method not implemented.");
    }

    async findBySessionId(sessionId){
        throw new Error("Method not implemented.");
    }

    async findActiveBySessionId(sessionId){
        throw new Error("Method not implemented.");
    }

    async findByUserId(userId){
        throw new Error("Method not implemented.");
    }

    async updateLastActive(sessionId, lastActive){
        throw new Error("Method not implemented.");
    }

    async updateRefreshToken(sessionId, hashedRefreshToken){
        throw new Error("Method not implemented.");
    }

    async revokeSession(sessionId){
        throw new Error("Method not implemented.");
    }

    async revokeAllSessions(userId){
        throw new Error("Method not implemented.");
    }

    async deleteSession(sessionId){
        throw new Error("Method not implemented.");
    }
    async updateActiveTab(sessionId, tabId){
        throw new Error("Method not implemented.");
    }
}

export default SessionRepository;