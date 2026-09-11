class IkeyBundleRepository {
    async upsert(data){
        throw new Error("Method not implemented.");
    }
    async findByUserId(userId){
        throw new Error("Method not implemented.");
    }
    async addOneTimePreKeys(userId, deviceId,  keys){
        throw new Error("Method not implemented.");
    }
    async popOneTimePreKey(userId, deviceId){
        throw new Error("Method not implemented.");
    }
    async countOneTimePreKeys(userId, deviceId){
        throw new Error("Method not implemented.");
    }
}

export default IkeyBundleRepository;