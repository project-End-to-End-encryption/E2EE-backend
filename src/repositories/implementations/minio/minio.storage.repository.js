import {Client} from 'minio';
import {randomUUID} from 'crypto';
import path from 'path';
import StorageRepository from "../../interfaces/storage.repository.js";
import minioConfig from "../../../config/minio.config.js";

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
            'profile',
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

    async getPresignedUrl(bucket, key, expirySeconds = 60 * 5){
        return this.client.presignedGetObject(bucket, key, expirySeconds);
    }
}

export default MinioStorageRepository;

