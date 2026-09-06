import {asyncHandler} from "../../../shared/utils/asyncHandler.js";
import MongoUserRepository from "../../../repositories/implementations/mongodb/mongo.user.repository.js";
import MinioStorageRepository from "../../../repositories/implementations/minio/minio.storage.repository.js";
import ProfileService from "./profile.service.js";
import {SuccessResponse} from "../../../shared/utils/response.js";


const userRepository = new MongoUserRepository();
const storageRepository = new MinioStorageRepository();
const profileService = new ProfileService(userRepository,storageRepository);

export const getProfilePictureUploadUrl = asyncHandler(async (req,res) =>{
    const {fileName, mimeType} = req.body; // frontend will setup this

    const userId = req.user.userId;

    const result = await profileService.requestProfilePictureUploadUrl(userId, fileName, mimeType);

    res.status(200).json(new SuccessResponse('Upload URL generated', result));
});

export const completeProfile = asyncHandler(async (req, res) => {
    const { fullName, userBio, profilePictureKey } = req.body;
    const userId = req.user.userId;

    const result = await profileService.completeProfile(userId, { fullName, userBio, profilePictureKey });

    res.status(200).json(new SuccessResponse('Profile completed', result));
});