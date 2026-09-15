class IRecoveryRepository {
    async createIfAbsent(blob) {
        throw new Error("Method not implemented.");
    }

    async findByUserId(userId) {
        throw new Error("Method not implemented.");
    }

    async replace(userId, blob) {
        throw new Error("Method not implemented.");
    }

    async touchRestored(userId) {
        throw new Error("Method not implemented.");
    }

    async deleteByUserId(userId) {
        throw new Error("Method not implemented.");
    }
}

export default IRecoveryRepository;