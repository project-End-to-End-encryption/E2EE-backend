import mongoose from "mongoose";

const groupMemberSchema = new mongoose.Schema({
    userId: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ['owner', 'admin', 'member'], default: 'member'
    },
    joinedAt: {
        type: Date,
        default: Date.now
    }
},{_id: false});

const groupSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    createdBy: {
        type: String,
        required: true
    },
    members: {
        type: [groupMemberSchema], default: []
    }
}, {timestamps: true});

export const GroupModel = mongoose.model('Group', groupSchema);