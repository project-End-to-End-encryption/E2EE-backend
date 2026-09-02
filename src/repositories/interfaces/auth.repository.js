class AuthRedis {
    async createAuth(authData){
        throw new Error("Method not implemented.");
    }
    async findByEmail(email){
        throw new Error("Method not implemented.");
    }
    async findByAuthId(authId){
        throw new Error("Method not implemented.");
    }
    async updatePassword(authId, hashedPassword){
        throw new Error("Method not implemented.");
    }
}

export default AuthRedis();