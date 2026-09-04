import mongoose from 'mongoose';

const authSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    hashedPassword: {
        type: String,
    },
    provider: {
        type: String,
        required: true,
        enum: ['local', 'google', 'github'],
        default: 'local'
    }
}, {timestamps: true});

const Auth = mongoose.model('Auth', authSchema);

export { Auth };