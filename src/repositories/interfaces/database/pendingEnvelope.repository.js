class IPendingEnvelopeRepository {
    /** Bulk insert - one call for the whole fan-out, never a loop. */
    async enqueueMany(rows) {
        throw new Error("Method not implemented.");
    }

    async drain(toUserId, toDeviceId, { afterId, limit }) {
        throw new Error("Method not implemented.");
    }

    async ackMany(toUserId, toDeviceId, ids) {
        throw new Error("Method not implemented.");
    }

    async countFor(toUserId, toDeviceId) {
        throw new Error("Method not implemented.");
    }
}

export default IPendingEnvelopeRepository;