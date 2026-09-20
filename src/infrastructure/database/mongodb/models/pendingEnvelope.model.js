/**
 * PendingEnvelope  (the offline TRANSPORT queue)
 *
 *  Message     = durable archive, one row per message,
 *                CAK-encrypted, readable by every device that has the MBK, kept forever.
 *
 *  PendingEnvelope = one row per *offline recipient device*, ratchet-encrypted,
 *                    readable exactly once by exactly that device, deleted on
 *                    ack, TTL-expired if the device never comes back.
 *
 *  Sizing: only messages sent to *offline* devices land here, and they leave on
 *  * the next connect. The collection stays small; the TTL index is the backstop
 *  * against devices that are never seen again.
 *
 *  in kind:
 *  'message' (ratchet envelope)
 *  'senderKey' (group key distribution)
 *  'control' (conversation-key handoff, key rotation, etc.)
 */
import mongoose from "mongoose";

const pendingEnvelopeSchema = new mongoose.Schema({
    toUserId: {
        type: String,
        required: true
    },
    toDeviceId: {
        type: String,
        required: true
    },
    fromUserId: {
        type: String,
        required: true
    },
    fromDeviceId: {
        type: String,
        required: true
    },
    conversationId: {
        type: String,
        default: null
    },
    kind: {
        type: String,
        required: true,
        enum: ['message', 'senderKey', 'control'],
        default: 'message'
    },
    envelop: {
        type: mongoose.Schema.Types.Mixed,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {timestamps: false, minimize: false});

pendingEnvelopeSchema.index({toUserId: 1, toDeviceId: 1, _id:1});

pendingEnvelopeSchema.index({createdAt: 1},{expireAfterSeconds: 60 * 60 * 24 * 30});

export const PendingEnvelopeModel = mongoose.model('PendingEnvelope', pendingEnvelopeSchema)