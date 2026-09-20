import {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
    HeadObjectCommand,
    HeadBucketCommand
} from '@aws-sdk/client-s3';

import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

import { randomUUID } from 'crypto';
import path from 'path';

import StorageRepository from "../../interfaces/storage/storage.repository.js";

import s3Config from '../../../config/s3.config.js';

class S3StorageRepository extends StorageRepository {

    constructor(config = s3Config) {
        super();

        this.buckets = config.bucket;

        this.client = new S3Client({
            region: config.region,

            // If credentials are supplied, use them.
            // Otherwise AWS SDK can resolve credentials through
            // the normal AWS credential provider chain.
            ...(config.credentials?.accessKeyId &&
            config.credentials?.secretAccessKey
                ? {
                    credentials: {
                        accessKeyId: config.credentials.accessKeyId,
                        secretAccessKey: config.credentials.secretAccessKey
                    }
                }
                : {})
        });
    }


    /**
     * Verify that required S3 buckets exist and are accessible.
     *
     * Unlike local MinIO, production S3 buckets should normally be
     * created through AWS infrastructure/IaC rather than application
     * startup.
     */
    async init() {
        const buckets = Object.values(this.buckets);

        for (const bucket of buckets) {
            if (!bucket) continue;

            try {
                await this.client.send(
                    new HeadBucketCommand({
                        Bucket: bucket
                    })
                );
            } catch (error) {
                throw new Error(
                    `S3 bucket "${bucket}" is unavailable or inaccessible: ${error.message}`
                );
            }
        }
    }


    /**
     * Internal helper for normal server-side uploads.
     */
    async #put(
        bucket,
        keyPrefix,
        fileBuffer,
        originalName,
        mimeType
    ) {
        const ext = path.extname(originalName || '').toLowerCase();

        const key = `${keyPrefix}/${randomUUID()}${ext}`;

        await this.client.send(
            new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType || 'application/octet-stream'
            })
        );

        return {
            bucket,
            key
        };
    }


    // -------------------------------------------------------------------------
    // Profile picture
    // -------------------------------------------------------------------------

    async uploadProfilePicture(
        fileBuffer,
        originalName,
        mimetype
    ) {
        return this.#put(
            this.buckets.profileAssets,
            'profilePicture',
            fileBuffer,
            originalName,
            mimetype
        );
    }


    async deleteProfilePicture(key) {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.buckets.profileAssets,
                Key: key
            })
        );
    }


    // -------------------------------------------------------------------------
    // Legacy/server-side attachment upload
    // -------------------------------------------------------------------------

    async uploadAttachment(
        fileBuffer,
        originalName,
        mimeType,
        { conversationId = 'misc' } = {}
    ) {
        return this.#put(
            this.buckets.encryptedAttachment,
            `chat/${conversationId}`,
            fileBuffer,
            originalName,
            mimeType
        );
    }


    async deleteAttachment(key) {
        await this.client.send(
            new DeleteObjectCommand({
                Bucket: this.buckets.encryptedAttachment,
                Key: key
            })
        );
    }


    // -------------------------------------------------------------------------
    // E2EE encrypted media
    // -------------------------------------------------------------------------

    buildAttachmentKey({
                           conversationId = 'misc',
                           kind = 'blob'
                       } = {}) {

        // No filename.
        // No extension.
        // No plaintext metadata.
        //
        // Example:
        // chat/conv123/image/550e8400-e29b-41d4-a716-446655440000

        return `chat/${conversationId}/${kind}/${randomUUID()}`;
    }


    /**
     * Create a short-lived presigned PUT URL.
     *
     * The browser uploads ciphertext directly to S3.
     *
     * Node.js never receives the attachment bytes.
     */
    async createUploadTarget({
                                 key,
                                 expirySeconds = 15 * 60,
                                 contentLength
                             } = {}) {

        const command = new PutObjectCommand({
            Bucket: this.buckets.encryptedAttachment,
            Key: key,

            // Keep storage content type generic.
            // The actual MIME type is hidden inside the encrypted payload.
            ContentType: 'application/octet-stream'
        });

        const url = await getSignedUrl(
            this.client,
            command,
            {
                expiresIn: expirySeconds
            }
        );

        return {
            url,
            method: 'PUT',

            headers: {
                'Content-Type': 'application/octet-stream'
            },

            expiresAt: Date.now() + expirySeconds * 1000
        };
    }


    /**
     * Create a short-lived presigned GET URL.
     *
     * The browser downloads ciphertext directly from S3.
     */
    async createDownloadUrl({
                                key,
                                expirySeconds = 5 * 60
                            } = {}) {

        const command = new GetObjectCommand({
            Bucket: this.buckets.encryptedAttachment,
            Key: key
        });

        const url = await getSignedUrl(
            this.client,
            command,
            {
                expiresIn: expirySeconds
            }
        );

        return {
            url,
            expiresAt: Date.now() + expirySeconds * 1000
        };
    }


    /**
     * Check whether an attachment exists and retrieve its metadata.
     */
    async statAttachment(key) {

        try {
            const result = await this.client.send(
                new HeadObjectCommand({
                    Bucket: this.buckets.encryptedAttachment,
                    Key: key
                })
            );

            return {
                size: result.ContentLength,
                etag: result.ETag,
                lastModified: result.LastModified
            };

        } catch (error) {

            // S3 commonly exposes missing objects as 404 / NotFound.
            if (
                error?.name === 'NotFound' ||
                error?.name === 'NoSuchKey' ||
                error?.$metadata?.httpStatusCode === 404
            ) {
                return null;
            }

            throw error;
        }
    }


    // -------------------------------------------------------------------------
    // Generic helpers
    // -------------------------------------------------------------------------

    async getPresignedUrl(
        bucket,
        key,
        expirySeconds = 5 * 60
    ) {

        const command = new GetObjectCommand({
            Bucket: bucket,
            Key: key
        });

        return getSignedUrl(
            this.client,
            command,
            {
                expiresIn: expirySeconds
            }
        );
    }


    async getPresignedUploadUrl(
        bucket,
        key,
        expirySeconds = 10 * 60
    ) {

        const command = new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            ContentType: 'application/octet-stream'
        });

        return getSignedUrl(
            this.client,
            command,
            {
                expiresIn: expirySeconds
            }
        );
    }


    async getObjectBuffer(bucket, key) {

        const result = await this.client.send(
            new GetObjectCommand({
                Bucket: bucket,
                Key: key
            })
        );

        if (!result.Body) {
            return Buffer.alloc(0);
        }

        const chunks = [];

        for await (const chunk of result.Body) {
            chunks.push(chunk);
        }

        return Buffer.concat(chunks);
    }


    generateProfilePictureKey(originalName) {

        const ext = path
            .extname(originalName || '')
            .toLowerCase();

        return `profilePicture/${randomUUID()}${ext}`;
    }
}


export default S3StorageRepository;