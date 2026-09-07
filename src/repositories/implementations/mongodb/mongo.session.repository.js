import {Session} from "../../../infrastructure/database/mongodb/models/session.model.js";
import SessionRepository from "../../interfaces/database/session.repository.js";

class MongoSessionRepository extends SessionRepository{

    async createSession(sessionData, session) {
        const newSession = new Session(sessionData);

        await newSession.save({ session });

        return newSession;
    }

    async findBySessionId(sessionId) {
        return await Session.findOne({ sessionId });
    }

    async findActiveBySessionId(sessionId) {
        return await Session.findOne({
            sessionId,
            isActive: true
        });
    }

    async findByUserId(userId) {
        return await Session.find({ userId });
    }

    async updateLastActive(sessionId, lastActive) {
        return await Session.findOneAndUpdate(
            { sessionId },
            { lastActive },
            { new: true, runValidators: true }
        );
    }

    async updateRefreshToken(sessionId, hashedRefreshToken) {
        return await Session.findOneAndUpdate(
            { sessionId },
            { hashedRefreshToken },
            { new: true, runValidators: true }
        );
    }

    async revokeSession(sessionId) {
        return await Session.findOneAndUpdate(
            { sessionId },
            {
                isActive: false,
                revokedAt: new Date()
            },
            { new: true, runValidators: true }
        );
    }

    async revokeAllSessions(userId) {
        return await Session.updateMany(
            { userId, isActive: true },
            {
                isActive: false,
                revokedAt: new Date()
            }
        );
    }

    async deleteSession(sessionId) {
        return await Session.findOneAndDelete({ sessionId });
    }

    async updateActiveTab(sessionId, tabId){
        return await Session.findOneAndUpdate(
            {sessionId},
            {activeTabId: tabId},
            {new: true, runValidators: true}
        );
    }
}

export default MongoSessionRepository;