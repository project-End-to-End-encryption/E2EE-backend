import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    authId:{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Auth',
      required: true,
      unique: true
    },
    username: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    userBio:{
        type: String,
        trim: true,
    },
    profilePictureUrl:{
        type: String,
        required: true,
        trim: true,
    }

},{timestamps:true});

const User = mongoose.model('Users', userSchema);

export { User };