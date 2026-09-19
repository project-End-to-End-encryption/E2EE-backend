class UserRepository {
    async createUser(userData){
        throw new Error("Method not implemented.");
    }
    async findByUsername(username){
        throw new Error("Method not implemented.");
    }
    /** Directory lookup for the chat UI. username prefix OR exact email. */
    async searchDirectory(query, {limit, excludeUserId} = {}){
        throw new Error("Method not implemented.");
    }
    /** Batch profile lookup for rendering conversation rows. */
    async findManyByIds(userIds){
        throw new Error("Method not implemented.");
    }
    async findByUserId(userId){
        throw new Error("Method not implemented.");
    }
    async updateUser(userId, updateData){
        throw new Error("Method not implemented.");
    }
    async deleteUser(userId){
        throw new Error("Method not implemented.");
    }
}

export default UserRepository;