import {User} from '../../../../infrastructure/database/mongodb/models/user.model.js';
import {Auth} from '../../../../infrastructure/database/mongodb/models/auth.model.js';
import UserRepository from '../../../interfaces/database/user/user.repository.js';

// Only these fields ever leave the directory. No email, no authId, no
// timestamps - see modules/user/userSearch/userSearch.service.js.
const PUBLIC_PROJECTION = 'username fullName profilePictureKey accountStatus';

const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

    async searchDirectory(query, {limit = 10, excludeUserId = null} = {}){
        const term = String(query || '').trim().toLowerCase();
        if(!term) return [];

        const filter = {accountStatus: 'active'};
        if(excludeUserId) filter._id = {$ne: excludeUserId};

        if(term.includes('@') && term.includes('.')){
            const auth = await Auth.findOne({email: term}).select('_id').lean();
            if(!auth) return [];

            return User.find({...filter, authId: auth._id})
                .select(PUBLIC_PROJECTION)
                .limit(limit)
                .lean();
        }

        return User.find({...filter, username: new RegExp('^' + escapeRegex(term))})
            .select(PUBLIC_PROJECTION)
            .limit(limit)
            .lean();
    }

    async findManyByIds(userIds){
        if(!Array.isArray(userIds) || !userIds.length) return [];
        return User.find({_id: {$in: userIds}})
            .select(PUBLIC_PROJECTION)
            .lean();
    }
}

export default MongoUserRepository;