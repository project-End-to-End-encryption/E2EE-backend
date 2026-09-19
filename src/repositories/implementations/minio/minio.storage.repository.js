import {Client} from 'minio';
import {randomUUID} from 'crypto';
import path from 'path';
import StorageRepository from "../../interfaces/storage/storage.repository.js";
import minioConfig from "../../../config/minio.config.js";

/**
 * MinIO implementation of StorageRepository.
 *
 * This is the ONLY file in the backend that imports the minio client, and no
 * file outside src/repositories/ imports this class directly - resolve it
 * through repositories/storage/storageProvider.js instead.
 */
class MinioStorageRepository extends StorageRepository{
    constructor(config = minioConfig) {
        super();
        this.buckets = config.bucket;
        this.client = new Client({
            endPoint: config.endpoint,
            port: config.port,
            useSSL: config.useSSL,
            accessKey: config.credentials.accessKey,
            secretKey: config.credentials.secretKey
        });
    }

    async init(){
        for(const bucket of Object.values(this.buckets)){
            if (!bucket) continue;
            const exists = await this.client.bucketExists(bucket);
            if (!exists) await this.client.makeBucket(bucket);
        }
    }

    async #put(bucket, keyPrefix, fileBuffer, originalName, mimeType){
        const ext = path.extname(originalName || '').toLowerCase();
        const key = `${keyPrefix}/${randomUUID()}${ext}`;

        await this.client.putObject(bucket,key,fileBuffer,fileBuffer.length,{
            'Content-Type': mimeType
        });
        return {bucket, key};
    }

    async uploadProfilePicture(fileBuffer, originalName, mimetype){
        return this.#put(
            this.buckets.profileAssets,
            'profilePicture',
            fileBuffer,
            originalName,
            mimetype
        );
    }

    async deleteProfilePicture(key){
        await this.client.removeObject(this.buckets.profileAssets, key);
    }

    async uploadAttachment(fileBuffer, originalName, mimeType, {conversationId = 'misc'} = {}){
        return this.#put(
            this.buckets.encryptedAttachment,
            `chat/${conversationId}`,
            fileBuffer,
            originalName,
            mimeType
        );
    }

    async deleteAttachment(key){
        await this.client.removeObject(this.buckets.encryptedAttachment, key);
    }

    // ---- encrypted media: key minting + presigned grants -------------------

    buildAttachmentKey({conversationId = 'misc', kind = 'blob'} = {}){
        // No extension, no file name. The object is a sealed blob and its key
        // must not describe what is inside it.
        return `chat/${conversationId}/${kind}/${randomUUID()}`;
    }

    async createUploadTarget({key, expirySeconds = 15 * 60} = {}){
        const url = await this.client.presignedPutObject(
            this.buckets.encryptedAttachment,
            key,
            expirySeconds
        );

        return {
            url,
            method: 'PUT',
            // application/octet-stream everywhere: the real type is inside the
            // ciphertext and the storage layer has no business knowing it.
            headers: {'Content-Type': 'application/octet-stream'},
            expiresAt: Date.now() + expirySeconds * 1000
        };
    }

    async createDownloadUrl({key, expirySeconds = 5 * 60} = {}){
        const url = await this.client.presignedGetObject(
            this.buckets.encryptedAttachment,
            key,
            expirySeconds
        );
        return {url, expiresAt: Date.now() + expirySeconds * 1000};
    }

    async statAttachment(key){
        try {
            const stat = await this.client.statObject(this.buckets.encryptedAttachment, key);
            return {
                size: stat.size,
                etag: stat.etag,
                lastModified: stat.lastModified
            };
        } catch (error) {
            if (error?.code === 'NotFound' || error?.code === 'NoSuchKey') return null;
            throw error;
        }
    }


    async getPresignedUrl(bucket, key, expirySeconds = 60 * 5){
        return this.client.presignedGetObject(bucket, key, expirySeconds);
    }

    async getPresignedUploadUrl(bucket, key, expirySeconds = 60 * 10){
        return this.client.presignedPutObject(bucket, key, expirySeconds);
    }

    async getObjectBuffer(bucket, key) {
        const stream = await this.client.getObject(bucket, key);
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        return Buffer.concat(chunks);
    }

    generateProfilePictureKey(originalName) {
        const ext = path.extname(originalName || '').toLowerCase();
        return `profilePicture/${randomUUID()}${ext}`;
    }
}

export default MinioStorageRepository;
