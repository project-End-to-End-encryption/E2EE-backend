import {KeyBundleModel} from "../../../infrastructure/database/mongodb/models/keys.model.js";
import IkeyBundleRepository from "../../interfaces/database/keys.repository.js";

class KeyBundleRepository extends IkeyBundleRepository{
    async upsert(data){
        return KeyBundleModel.findOneAndUpdate(
            {userId: data.userId},
            {$set: data},
            {upsert: true, returnDocument: 'after'}
        );
    }
    async findByUserId(userId){
        return KeyBundleModel.findOne({userId}).lean();
    }
    async addOneTimePreKeys(userId, keys){
        return KeyBundleModel.updateOne(
            {userId},
            {$push: {oneTimePreKeys: {$each: keys}}}
        );
    }
    async popOneTimePreKey(userId) {
        const doc = await KeyBundleModel.findOneAndUpdate(
            {
                userId,
                oneTimePreKeys: {
                    $exists: true,
                    $ne: []
                }
            },
            {
                $pop: {
                    oneTimePreKeys: -1
                }
            },
            {
                returnDocument: 'before'
            }
        ).lean();

        if (!doc || !doc.oneTimePreKeys?.length) {
            return null;
        }

        return doc.oneTimePreKeys[0];
    }
    async countOneTimePreKeys(userId){
        const doc = await KeyBundleModel.findOne(
            {userId},
            {oneTimePreKeys: 1}
        ).lean();

        return doc?.oneTimePreKeys?.length ?? 0;
    }
}

export default new IkeyBundleRepository();