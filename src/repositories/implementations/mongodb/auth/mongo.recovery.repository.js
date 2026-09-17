import {RecoveryBlobModel} from "../../../../infrastructure/database/mongodb/models/recoveryBlob.model.js";
import IRecoveryRepository from "../../../interfaces/database/auth/recovery.repository.js";

class MongoRecoveryRepository extends IRecoveryRepository{
    async createIfAbsent(blob){
        try{
            const doc = await RecoveryBlobModel.create(blob);
            return doc.toObject();
        } catch(error){
            if(error.code === 11000) return null;
            throw error;
        }
    }

    async findByUserId(userId){
        return RecoveryBlobModel.findOne({userId}).lean();
    }

    // if user lost its keys Increments the generation so the client can detect
    // that its cached MBK is worthless

    async replace(userId, blob){
        return RecoveryBlobModel.findOneAndUpdate(
            {userId},
            {
                $set: {
                    version: blob.version,
                    kdf: blob.kdf,
                    verifier: blob.verifier,
                    encryptedIdentityKey: blob.encryptedIdentityKey,
                    encryptedMasterBackupKey: blob.encryptedMasterBackupKey
                },
                $inc: {generation: 1}
            },
            {
                returnDocument: 'after', upsert: true, runValidators: true
            }
        ).lean();
    }

    async touchRestored(userId) {
        return RecoveryBlobModel.updateOne(
            {userId},
            { $set: {lastRestoredAt: new Date() }}
        );
    }

    async deleteByUserId(userId){
        return RecoveryBlobModel.deleteOne({userId});
    }
}

export default new MongoRecoveryRepository();