import {Auth} from '../../../infrastructure/database/mongodb/models/auth.model.js'
import AuthRepository from "../../interfaces/auth.repository.js";

class MongoAuthRepository extends AuthRepository{
    async createAuth(authData,session){
        const auth = new Auth(authData);
        await auth.save({ session });
        return auth;
    }
    async findByEmail(email){
        return await Auth.findOne({ email: email });
    }
    async findByAuthId(authId){
        return await Auth.findById(authId);
    }
    async updatePassword(authId, hashedPassword){
        return await Auth.findByIdAndUpdate(
            authId, {hashedPassword}, {new: true, runValidators:true}
        )
    }
    async deleteAuth(authId){
        return await Auth.findByIdAndDelete(authId);
    }
}

export default MongoAuthRepository;