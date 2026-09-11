class IkeyBundleRepository {
    async upsert(data){
        throw new Error("Method not implemented.");
    }
    async findByUserId(userId){
        throw new Error("Method not implemented.");
    }
    async addOneTimePreKeys(userId, keys){
        throw new Error("Method not implemented.");
    }
    async popOneTimePreKey(userId){
        throw new Error("Method not implemented.");
    }
    async countOneTimePreKeys(userId){
        throw new Error("Method not implemented.");
    }
}

export default IkeyBundleRepository;