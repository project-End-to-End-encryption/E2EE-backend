import IPendingEnvelopeRepository from "../../../interfaces/database/messaging/pendingEnvelope.repository.js";
import {PendingEnvelopeModel} from "../../../../infrastructure/database/mongodb/models/pendingEnvelope.model.js";

class MongoPendingEnvelopeRepository extends IPendingEnvelopeRepository{
    async enqueueMany(rows){
        if(!rows?.length) return [];
        return PendingEnvelopeModel.insertMany(rows, { ordered: false });
    }
    async drain(toUserId, toDeviceId, {afterId = null, limit = 200} = {}){
        const filter = {toUserId: String(toUserId), toDeviceId};

        if(afterId) filter._id = {$gt: afterId};

        return PendingEnvelopeModel.find(filter)
            .sort({_id: 1})
            .limit(Math.min(limit, 500))
            .lean();
    }

    async ackMany(toUserId, toDeviceId, ids){
        if(!ids?.length) return {deletedCount: 0};

        return PendingEnvelopeModel.deleteMany({
            _id: {$in: ids},
            toUserId: String(toUserId),
            toDeviceId
        });
    }

    async countFor(toUserId, toDeviceId) {
        return PendingEnvelopeModel.countDocuments({toUserId: String(toUserId), toDeviceId});
    }

    async deleteAllForUser(userId){
        return PendingEnvelopeModel.deleteMany({toUserId: String(userId)});
    }
}

export default new MongoPendingEnvelopeRepository();