const s3Config = {
    region: process.env.AWS_REGION,

    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    },

    bucket: {
        profileAssets: process.env.S3_PROFILE_BUCKET,
        encryptedAttachment: process.env.S3_ATTACHMENT_BUCKET
    }
};

export default s3Config;