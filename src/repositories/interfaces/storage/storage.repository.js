/**
 * STORAGE REPOSITORY (interface)
 *
 * The application depends on THIS, never on a MinIO or S3 client. Swapping
 * MinIO for S3 in production means adding one implementation of this class and
 * changing STORAGE_PROVIDER in the environment - no call site moves.
 *
 * Everything in the encrypted-attachment half of this interface deals in
 * ciphertext only. The bytes that go through uploadAttachment / the presigned
 * PUT have already been sealed in the browser, and the key that sealed them is
 * never sent here.
 */
class StorageRepository {

    // ---- profile assets (signup flow) -------------------------------------

    async uploadProfilePicture(fileBuffer, originalName, mimetype) {
        throw new Error('Method not implemented.');
    }

    async deleteProfilePicture(key) {
        throw new Error('Method not implemented.');
    }

    // ---- encrypted chat attachments ---------------------------------------

    /** Server-side upload of an already-encrypted buffer. */
    async uploadAttachment(fileBuffer, originalName, mimeType, {conversationId} = {}){
        throw new Error('Method not implemented.');
    }

    async deleteAttachment(key){
        throw new Error('Method not implemented.');
    }

    /**
     * Mint the object key for a new attachment. Opaque by construction: it
     * carries no file name and no mime type, because both describe plaintext.
     */
    buildAttachmentKey({conversationId, kind = 'blob'} = {}){
        throw new Error('Method not implemented.');
    }

    /**
     * A short-lived, single-object grant for the browser to PUT ciphertext
     * directly. Returns {url, method, headers, expiresAt} so a provider that
     * needs different verbs or headers (POST policy, SSE headers) can say so
     * without the caller knowing which provider it is.
     */
    async createUploadTarget({key, expirySeconds, contentLength} = {}){
        throw new Error('Method not implemented.');
    }

    /** A short-lived GET grant for the same object. */
    async createDownloadUrl({key, expirySeconds} = {}){
        throw new Error('Method not implemented.');
    }

    /** {size, etag, lastModified} or null when the object is absent. */
    async statAttachment(key){
        throw new Error('Method not implemented.');
    }

    // ---- generic escape hatches -------------------------------------------

    async getPresignedUrl(bucket, key, expirySeconds){
        throw new Error('Method not implemented.');
    }

    async getObjectBuffer(bucket, key){
        throw new Error('Method not implemented.');
    }
}

export default StorageRepository;
