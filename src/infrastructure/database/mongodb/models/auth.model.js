import mongoose from 'mongoose';

const authSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    hashedPassword: {
        type: String,
        required: true,
    },
}, {timestamps: true});

const Auth = mongoose.model('Auth', authSchema);

export { Auth };