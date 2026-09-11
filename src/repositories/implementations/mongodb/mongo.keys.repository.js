import {KeyBundleModel} from "../../../infrastructure/database/mongodb/models/keys.model.js";
import IkeyBundleRepository from "../../interfaces/database/keys.repository.js";

class KeyBundleRepository extends IkeyBundleRepository{
    async upsert(data){
        return KeyBundleModel.findOneAndUpdate(
            {userId: data.userId, deviceId: data.deviceId},
            {$set: data},
            {upsert: true, returnDocument: 'after', runValidators: true}
        );
    }
    async findByUserId(userId){
        return KeyBundleModel.find({userId}).lean();
    }
    async addOneTimePreKeys(userId, deviceId, keys){
        return KeyBundleModel.updateOne(
            {userId, deviceId},
            {$push: {oneTimePreKeys: {$each: keys}}},{runValidators: true}
        );
    }
    async popOneTimePreKey(userId,deviceId) {
        const doc = await KeyBundleModel.findOneAndUpdate(
            {
                userId, deviceId,
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
    async countOneTimePreKeys(userId, deviceId){
        const doc = await KeyBundleModel.findOne(
            {userId, deviceId},
            {oneTimePreKeys: 1}
        ).lean();

        return doc?.oneTimePreKeys?.length ?? 0;
    }
}

export default KeyBundleRepository;