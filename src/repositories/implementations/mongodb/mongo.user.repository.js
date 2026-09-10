import {User} from '../../../infrastructure/database/mongodb/models/user.model.js';
import UserRepository from '../../interfaces/database/user.repository.js';

class MongoUserRepository extends UserRepository {
    async createUser(userData,session) {
        const [newUser] = await User.create([userData], { session });
        return newUser;
    }
    async findByUsername(username){
        return await User.findOne({username});
    }
    async findByUserId(userId){
        return await User.findById(userId);
    }
    async findByAuthId(authId){
        return await User.findOne({authId: authId});
    }
    async updateUser(userId, updateData){
        return await User.findByIdAndUpdate(
            userId,updateData,{returnDocument: 'after', runValidators: true}
        );
    }
    async deleteUser(userId){
        return await User.findByIdAndDelete(userId);
    }
}

export default MongoUserRepository;