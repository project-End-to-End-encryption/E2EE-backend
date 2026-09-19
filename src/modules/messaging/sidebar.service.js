import redisClient from "../../config/redis.config.js";
import {REDIS_KEYS, REDIS_TTL} from "../../shared/constants/redisKeys.js";
import ConversationRepository
    from '../../repositories/implementations/mongodb/conversation/mongo.conversation.repository.js'
import ConversationStateRepository from
        '../../repositories/implementations/mongodb/conversation/mongo.conversationState.repository.js'
import {ConversationModel} from "../../infrastructure/database/mongodb/models/conversation.model.js";
import {ConversationStateModel} from "../../infrastructure/database/mongodb/models/conversationState.model.js";
/**
 * SIDEBAR SYNC SERVICE
 *
 *  * The client keeps the entire sidebar in IndexedDB
 *  * Three are 3 possible answers
 *
 *  * * "nothing"   -> one Redis GET, zero Mongo reads.
 *  * * these 3 rows changed
 *  * * your cursor is unusable, here is everything
 */

const TOMBSTONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

export const SIDEBAR_SCHEMA_VERSION = 1;

const DEFAULT_PAGE = 100;
const MAX_PAGE = 300;

export const bumpSidebarRev = async (userIds, at = Date.now()) => {
    const ids = Array.isArray(userIds) ? userIds : [userIds];
    if(!ids.length) return;

    try{
        const multi = redisClient.multi();
        for(const userId of ids){
            const key = REDIS_KEYS.sidebarRev(String(userId));
            multi.set(key, String(at));
            multi.expire(key, REDIS_TTL.sidebarRev);
        }
        await multi.exec();
    } catch {

    }
};

const readSidebarRev = async (userId) => {
    try{
        const value = await redisClient.get(REDIS_KEYS.sidebarRev(String(userId)));
        return value ? Number(value) : null;
    } catch {
        return null;
    }
};

// Row shaping

const buildRow = (conversation, state) => {
    const convUpdated = conversation.updatedAt ? new Date(conversation.updatedAt).getTime() : 0;
    const stateUpdated = state?.updatedAt ? new Date(state.updatedAt).getTime() : 0;
    const lastReadSeq = state?.lastReadSeq ?? 0;

    return {
        _id: String(conversation._id),
        type: conversation.type,
        name: conversation.name ?? null,
        avatarKey: conversation.avatarKey ?? null,
        createdBy: conversation.createdBy,
        memberIds: conversation.memberIds ?? [],
        // ordering + gap detection
        lastSeq: conversation.lastSeq ?? 0,
        lastMessageAt: conversation.lastMessageAt ?? null,
        // crypto
        keyEpoch: conversation.keyEpoch ?? 1,
        // per-user state
        lastReadSeq,
        lastDeliveredSeq: state?.lastDeliveredSeq ?? 0,
        unreadCount: Math.max(0, (conversation.lastSeq ?? 0) - lastReadSeq),
        clearedBeforeSeq: state?.clearedBeforeSeq ?? 0,
        isPinned: state?.isPinned ?? false,
        isArchived: state?.isArchived ?? false,
        mutedUntil: state?.mutedUntil ?? null,
        rev: Math.max(convUpdated, stateUpdated)
    };
};

// Fetch the per-user state rows for a set of conversations, as a Map

const stateMapFor = async (userId, conversationIds) =>{
    if(!conversationIds.length) return new Map();
    const states = await ConversationStateRepository.getManyForUser(userId,conversationIds);
    return new Map(states.map((s)=> [String(s.conversationId), s]));
};

// Full snapshot

export const fullSnapshot = async (
    userId,
    {afterId = null, limit = DEFAULT_PAGE} = {}
) => {

    const pageSize = Math.min(Number(limit) || DEFAULT_PAGE, MAX_PAGE);

    const filter = {memberIds: String(userId), isActive: true};

    if(afterId) filter._id = {$gt: afterId};

    const conversations = await ConversationModel
        .find(filter)
        .sort({_id : 1})
        .limit(pageSize)
        .lean();

    const ids = conversations.map((c) => String(c._id));
    const states = await stateMapFor(userId, ids);

    const rows = conversations.map((c) => buildRow(c, states.get(String(c._id))));

    return {
        mode: 'full',
        schemaVersion: SIDEBAR_SCHEMA_VERSION,
        conversations: rows,
        removed: [],
        nextAfterId: conversations.length ? String(conversations[conversations.length - 1]._id) : null,
        hasMore: conversations.length === pageSize,
        cursor: Date.now()
    };
};

// Delta    What changed since `since` (epoch ms)

export const delta = async (userId, {since, limit = DEFAULT_PAGE} = {}) =>{
    const pageSize = Math.min(Number(limit) || DEFAULT_PAGE, MAX_PAGE);
    const sinceDate = new Date(since);
    const uid = String(userId);

    // conversations whose own document changed

    const changedConversations = await ConversationModel
        .find({memberIds: uid, isActive: true, updatedAt: {$gt: sinceDate} })
        .sort({updatedAt: 1})
        .limit(pageSize + 1)
        .lean();

    // conversations whose *per-user state* changed

    const changedState = await ConversationStateModel
        .find({userId: uid, updatedAt: {$gt: sinceDate}})
        .sort({updatedAt: 1})
        .limit(pageSize + 1)
        .lean();

    // removals (tombstones)

    const removedDocs = await ConversationModel
        .find(
            { 'leftMembers.userId': uid, 'leftMembers.at': { $gt: sinceDate } },
            { _id: 1, leftMembers: 1 }
        )
        .limit(pageSize)
        .lean();

    const removedIds = removedDocs
        .filter((doc) => (doc.leftMembers || []).some(
            (entry) => String(entry.userId) === uid && new Date(entry.at) > sinceDate
        ))
        .map((doc) => String(doc._id));

    // union A + B by id

    const byId =
        new Map(changedConversations.map((c) => [String(c._id), c]));

    const missingIds = changedState
        .map((s) => String(s.conversationId))
        .filter((id) => !byId.has(id) && !removedIds.includes(id));

    if(missingIds.length){
        const extra = await ConversationModel
            .find({_id: {$in: missingIds}, memberIds: uid, isActive: true})
            .lean();
        for(const c of extra) byId.set(String(c._id), c);
    }

    for (const id of removedIds) byId.delete(id);

    const ids = Array.from(byId.keys());
    const states = await stateMapFor(uid, ids);

    let rows = ids
        .map((id) => buildRow(byId.get(id), states.get(id)))
        .sort((a,b) => a.rev - b.rev);

    const hasMore = rows.length > pageSize;
    if(hasMore) rows = rows.slice(0, pageSize);

    let cursor;
    if(hasMore && rows.length){
        cursor = rows[rows.length - 1].rev - 1;
    } else {
        const newestSent = rows.length ? rows[rows.length - 1].rev : 0;
        cursor = Math.max(since, newestSent, Date.now() - 1000);
    }

    return {
        mode: 'delta',
        schemaVersion: SIDEBAR_SCHEMA_VERSION,
        conversations: rows,
        removed: removedIds,
        cursor,
        hasMore,
        nextAfterId: null
    };
};

// Public entry point

export const sync =
    async (userId, {since = null, afterId = null, schemaVersion = null, limit} = {}) => {

        const cursorTooOld = since !== null && (Date.now() - Number(since)) > TOMBSTONE_RETENTION_MS;
        const schemaMismatch = schemaVersion !== SIDEBAR_SCHEMA_VERSION;
        const needFull = since === null || Number.isNaN(Number(since)) || cursorTooOld || schemaMismatch;

        if(needFull) {
            const snapshot = await fullSnapshot(userId, {afterId, limit});
            snapshot.reason = since === null ? 'NO_CURSOR' : cursorTooOld ? 'CURSOR_EXPIRED' : 'SCHEMA_CHANGED';

            return snapshot;
        }

        const rev = await readSidebarRev(userId);
        if(rev !== null && Number(since) >= rev){
            return {
                mode: 'delta',
                schemaVersion: SIDEBAR_SCHEMA_VERSION,
                conversations: [],
                removed: [],
                cursor: Number(since),
                hasMore: false,
                nextAfterId: null,
                upToDate: true
            };
        }
        return delta(userId, {since: Number(since), limit});
    };


// Build one row on demand

export const buildRowFor = async (conversationId, userId) => {
    const conversation = await ConversationRepository.findById(conversationId);

    if(!conversation) return null;
    if(!(conversation.memberIds || [] ).includes(String(userId))) return null;

    const state = await ConversationStateRepository.get(conversationId, userId);
    return buildRow(conversation, state);

};