import {BadRequestException, NotFoundException} from "../../../shared/errors/domainErrors.js";
import {fileTypeFromBuffer} from "file-type";

class ProfileService{
    constructor(userRepository, storageRepository) {
        this.userRepository = userRepository;
        this.storageRepository = storageRepository;
    }

    async requestProfilePictureUploadUrl(userId, originalName){
        const user = await this.userRepository.findByUserId(userId);
        if(!user){
            throw new NotFoundException('User not found');
        }
        const key = this.storageRepository.generateProfilePictureKey(originalName);
        const uploadUrl = await this.storageRepository.getPresignedUploadUrl(
            this.storageRepository.buckets.profileAssets,
            key
        );
        return {uploadUrl, key};
    }
    async completeProfile(userId, {fullName, userBio, profilePictureKey}){
        const user = await this.userRepository.findByUserId(userId);
        if(!user){
            throw new NotFoundException('User not Found')
        }
        const updateData = {fullName,userBio};

        if(profilePictureKey){
            const buffer = await this.storageRepository.getObjectBuffer(
                this.storageRepository.buckets.profileAssets,
                profilePictureKey
            );
            const type = await fileTypeFromBuffer(buffer);
            const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

            if (!type || !ALLOWED.includes(type.mime)) {
                // clean up the bad file so it doesn't sit in your bucket
                await this.storageRepository.deleteProfilePicture(profilePictureKey).catch(() => {});
                throw new BadRequestException('Uploaded file is not a valid image');
            }
            const previousKey = user.profilePictureKey;
            updateData.profilePictureKey = profilePictureKey;
            if (previousKey && previousKey !== profilePictureKey) {
                this.storageRepository.deleteProfilePicture(previousKey).catch(() => {});
            }
        }
        const updateUser = await this.userRepository.updateUser(userId,updateData);

        return {
            id: updateUser._id,
            username: updateUser.username,
            fullName: updateUser.fullName,
            userBio: updateUser.userBio,
        }

    }
}



export default ProfileService;