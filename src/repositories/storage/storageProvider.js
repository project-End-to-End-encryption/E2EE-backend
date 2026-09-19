import MinioStorageRepository from '../implementations/minio/minio.storage.repository.js';

/**
 * STORAGE PROVIDER RESOLUTION
 *
 *      media.service.js
 *            |
 *            v
 *      StorageRepository            <- the interface everything depends on
 *            |
 *      +-----+------------------+
 *      |                        |
 *  MinioStorageRepository   S3StorageRepository (future)
 *
 * Today STORAGE_PROVIDER is unset and this returns MinIO. Moving to S3 in
 * production is: add src/repositories/implementations/s3/s3.storage.repository.js
 * implementing the same interface, add one case below, set STORAGE_PROVIDER=s3.
 * No service, event handler or client file changes.
 */

let instance = null;

const build = () => {
    const provider = (process.env.STORAGE_PROVIDER || 'minio').toLowerCase();

    switch (provider) {
        case 'minio':
            return new MinioStorageRepository();

        case 's3':
            // Intentionally not stubbed out with a fake. A half-implemented
            // provider that silently returns undefined URLs is worse than a
            // startup failure that tells you exactly what is missing.
            throw new Error(
                'STORAGE_PROVIDER=s3 but no S3 implementation exists yet. ' +
                'Add s3.storage.repository.js implementing StorageRepository.'
            );

        default:
            throw new Error(`Unknown STORAGE_PROVIDER: ${provider}`);
    }
};

/** The process-wide storage repository. */
export const getStorage = () => {
    if (!instance) instance = build();
    return instance;
};

/** Called once at boot (bucket creation is provider-specific and idempotent). */
export const initStorage = async () => {
    const storage = getStorage();
    if (typeof storage.init === 'function') await storage.init();
    return storage;
};

export default { getStorage, initStorage };
