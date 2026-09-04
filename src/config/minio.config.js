import dotenv from 'dotenv'
dotenv.config()

const minioConfig = {
    endpoint: process.env.MINIO_ENDPOINT,

    port: process.env.MINIO_PORT,

    useSSL: process.env.MINIO_USE_SSL,

    credentials: {
        accessKey: process.env.MINIO_ACCESS_KEY,
        secretKey: process.env.MINIO_SECRET_KEY,
    },

    bucket: {
        profileAssets: process.env.MINIO_PROFILE_BUCKET,

        encryptedAttachment: process.env.MINIO_ENCRYPTED_BUCKET
    }
};

export default minioConfig;