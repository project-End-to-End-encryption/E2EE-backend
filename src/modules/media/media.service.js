import { randomUUID } from 'crypto';
import redisClient from '../../config/redis.config.js';
import { REDIS_KEYS, REDIS_TTL } from '../../shared/constants/redisKeys.js';
import { getStorage } from '../../repositories/storage/storageProvider.js';
import * as conversationService from '../messaging/conversation.service.js';
import {
    MessagingException,
    ForbiddenException,
    NotFoundException
} from '../../shared/errors/domainErrors.js';


// Ceilings are on CIPHERTEXT size. AES-GCM framing adds a little over the
// plaintext, so these are deliberately generous relative to the plaintext file.
const MAX_ATTACHMENT_BYTES = 256 * 1024 * 1024;   // 256 MB
const MAX_THUMBNAIL_BYTES = 2 * 1024 * 1024;      // 2 MB
const MAX_ATTACHMENTS_PER_REQUEST = 10;

const CATEGORIES = new Set(['image', 'video', 'audio', 'file']);

const UPLOAD_GRANT_SECONDS = 15 * 60;
const DOWNLOAD_GRANT_SECONDS = 5 * 60;

const assertMember = async (conversationId, userId) => {
    if (!conversationId) {
        throw new MessagingException('conversationId required', 'INVALID_PAYLOAD');
    }
    if (!(await conversationService.isMember(conversationId, userId))) {
        throw new ForbiddenException('Not a member of this conversation', 'NOT_A_MEMBER');
    }
};

const assertSize = (bytes, ceiling, label) => {
    const size = Number(bytes);
    if (!Number.isFinite(size) || size <= 0) {
        throw new MessagingException(`${label} size is missing or invalid`, 'INVALID_MEDIA');
    }
    if (size > ceiling) {
        throw new MessagingException(`${label} exceeds the size limit`, 'FILE_TOO_LARGE');
    }
    return size;
};

const rememberGrant = async (grant) => {
    try {
        await redisClient.setEx(
            REDIS_KEYS.mediaGrant(grant.attachmentId),
            REDIS_TTL.mediaGrant,
            JSON.stringify(grant)
        );
    } catch (error) {
        // Redis down. The grant is still valid (the presigned URL is signed by
        // the storage provider), we simply cannot re-verify it at completion.
        console.warn('[media] could not persist upload grant:', error.message);
    }
};

const readGrant = async (attachmentId) => {
    try {
        const raw = await redisClient.get(REDIS_KEYS.mediaGrant(attachmentId));
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
};

const forgetGrant = async (attachmentId) => {
    try {
        await redisClient.del(REDIS_KEYS.mediaGrant(attachmentId));
    } catch { /* best effort */ }
};


export const requestUpload = async (userId, { conversationId, attachments = [] } = {}) => {
    await assertMember(conversationId, userId);

    if (!Array.isArray(attachments) || !attachments.length) {
        throw new MessagingException('attachments required', 'INVALID_PAYLOAD');
    }
    if (attachments.length > MAX_ATTACHMENTS_PER_REQUEST) {
        throw new MessagingException('Too many attachments in one request', 'INVALID_PAYLOAD');
    }

    const storage = getStorage();
    const grants = [];

    for (const requested of attachments) {
        const category = String(requested?.category ?? 'file');
        if (!CATEGORIES.has(category)) {
            throw new MessagingException('Unsupported media category', 'UNSUPPORTED_MEDIA');
        }

        const encryptedSize = assertSize(
            requested?.encryptedSize, MAX_ATTACHMENT_BYTES, 'Attachment'
        );

        const attachmentId = randomUUID();
        const storageKey = storage.buildAttachmentKey({ conversationId, kind: category });

        const upload = await storage.createUploadTarget({
            key: storageKey,
            expirySeconds: UPLOAD_GRANT_SECONDS,
            contentLength: encryptedSize
        });

        let thumbnail = null;
        if (requested?.thumbnailEncryptedSize) {
            const thumbnailSize = assertSize(
                requested.thumbnailEncryptedSize, MAX_THUMBNAIL_BYTES, 'Thumbnail'
            );
            const thumbnailKey = storage.buildAttachmentKey({
                conversationId, kind: `${category}-thumb`
            });
            thumbnail = {
                thumbnailKey,
                encryptedSize: thumbnailSize,
                upload: await storage.createUploadTarget({
                    key: thumbnailKey,
                    expirySeconds: UPLOAD_GRANT_SECONDS,
                    contentLength: thumbnailSize
                })
            };
        }

        const grant = {
            attachmentId,
            conversationId: String(conversationId),
            userId: String(userId),
            storageKey,
            category,
            encryptedSize,
            thumbnailKey: thumbnail?.thumbnailKey ?? null,
            thumbnailEncryptedSize: thumbnail?.encryptedSize ?? null,
            grantedAt: Date.now()
        };

        await rememberGrant(grant);

        grants.push({
            attachmentId,
            storageKey,
            category,
            upload,
            thumbnailKey: thumbnail?.thumbnailKey ?? null,
            thumbnailUpload: thumbnail?.upload ?? null,
            expiresAt: upload.expiresAt
        });
    }

    return { conversationId: String(conversationId), grants };
};


export const completeUpload = async (userId, { conversationId, uploads = [] } = {}) => {
    await assertMember(conversationId, userId);

    if (!Array.isArray(uploads) || !uploads.length) {
        throw new MessagingException('uploads required', 'INVALID_PAYLOAD');
    }

    const storage = getStorage();
    const attachments = [];

    for (const upload of uploads) {
        const attachmentId = String(upload?.attachmentId ?? '');
        if (!attachmentId) {
            throw new MessagingException('attachmentId required', 'INVALID_PAYLOAD');
        }

        const grant = await readGrant(attachmentId);

        if (grant) {
            if (grant.userId !== String(userId) ||
                grant.conversationId !== String(conversationId)) {
                throw new ForbiddenException('Upload grant does not belong to you', 'UPLOAD_FAILED');
            }
        }

        const storageKey = grant?.storageKey ?? String(upload?.storageKey ?? '');
        if (!storageKey.startsWith(`chat/${conversationId}/`)) {
            throw new ForbiddenException('Object key is outside this conversation', 'UPLOAD_FAILED');
        }

        const stat = await storage.statAttachment(storageKey);
        if (!stat) {
            throw new NotFoundException('Uploaded object not found in storage');
        }

        let thumbnailKey = grant?.thumbnailKey ?? upload?.thumbnailKey ?? null;
        let thumbnailByteSize = null;

        if (thumbnailKey) {
            const thumbnailStat = await storage.statAttachment(thumbnailKey);
            if (thumbnailStat) {
                thumbnailByteSize = thumbnailStat.size;
            } else {
                // A missing thumbnail is cosmetic; the attachment itself is fine.
                thumbnailKey = null;
            }
        }

        attachments.push({
            attachmentId,
            storageKey,
            byteSize: stat.size,
            category: grant?.category ?? 'file',
            thumbnailKey,
            thumbnailByteSize,
            // Integrity of the ciphertext at rest, computed by the sender.
            sha256: typeof upload?.sha256 === 'string' ? upload.sha256 : null,
            createdAt: new Date()
        });

        await forgetGrant(attachmentId);
    }

    return { attachments };
};

export const requestDownload = async (userId, { conversationId, storageKeys = [] } = {}) => {
    await assertMember(conversationId, userId);

    const keys = (Array.isArray(storageKeys) ? storageKeys : [])
        .map((key) => String(key))
        .filter(Boolean)
        .slice(0, MAX_ATTACHMENTS_PER_REQUEST * 2);

    if (!keys.length) {
        throw new MessagingException('storageKeys required', 'INVALID_PAYLOAD');
    }

    for (const key of keys) {
        // Membership was checked for THIS conversation, so the key has to be
        // in this conversation's namespace. Otherwise conversation membership
        // anywhere would grant read access everywhere.
        if (!key.startsWith(`chat/${conversationId}/`)) {
            throw new ForbiddenException('Object key is outside this conversation', 'DOWNLOAD_FAILED');
        }
    }

    const storage = getStorage();
    const downloads = [];

    for (const key of keys) {
        const { url, expiresAt } = await storage.createDownloadUrl({
            key,
            expirySeconds: DOWNLOAD_GRANT_SECONDS
        });
        downloads.push({ storageKey: key, url, expiresAt });
    }

    return { downloads };
};

/** Abandoned upload (user cancelled, encryption failed). Best effort. */
export const abortUpload = async (userId, { conversationId, attachmentId } = {}) => {
    await assertMember(conversationId, userId);

    const grant = await readGrant(String(attachmentId ?? ''));
    if (!grant || grant.userId !== String(userId)) return { removed: false };

    const storage = getStorage();
    try {
        await storage.deleteAttachment(grant.storageKey);
        if (grant.thumbnailKey) await storage.deleteAttachment(grant.thumbnailKey);
    } catch (error) {
        console.warn('[media] abort cleanup failed:', error.message);
    }

    await forgetGrant(grant.attachmentId);
    return { removed: true };
};

export const MEDIA_LIMITS = {
    MAX_ATTACHMENT_BYTES,
    MAX_THUMBNAIL_BYTES,
    MAX_ATTACHMENTS_PER_REQUEST,
    CATEGORIES: [...CATEGORIES]
};
