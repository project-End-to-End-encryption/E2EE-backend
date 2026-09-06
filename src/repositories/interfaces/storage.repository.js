class StorageRepository {

    // this is for my signup phase
    async uploadProfilePicture(fileBuffer, originalName, mimetype) {
        throw new Error('Method not implemented.');
    }

    async deleteProfilePicture(key) {
        throw new Error('Method not implemented.');
    }

    // this is for my chat phase using webSocket

    async uploadAttachment(fileBuffer, originalName, mimeType, {conversationId} = {}){
        throw new Error('Method not implemented.');
    }

    async deleteAttachment(key){
        throw new Error('Method not implemented.');
    }

    async getPresignUrl(bucket, key, expirySeconds){
        throw new Error('Method not implemented.');
    }
    async getObjectBuffer(bucket, key){
        throw new Error('Method not implemented.');
    }
}

export default StorageRepository;