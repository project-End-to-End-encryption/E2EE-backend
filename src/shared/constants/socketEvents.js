export const SOCKET_EVENTS = {


    // keys / pre-key bundles
    KEYS_REGISTER: 'keys:register',
    KEYS_FETCH_BUNDLE: 'keys:fetchBundle',
    KEYS_COUNT_OTPK: 'keys:countOneTimePreKeys',
    KEYS_TOP_UP_OTPK: 'keys:topUpOneTimePreKeys',


    // conservation

    CONVERSATION_OPEN_DIRECT: 'conversation:openDirect',
    CONVERSATION_CREATE_GROUP: 'conversation:createGroup',
    CONVERSATION_LIST: 'conversation:list',
    CONVERSATION_ADD_MEMBER: 'conversation:addMember',
    CONVERSATION_REMOVE_MEMBER: 'conversation:removeMember',
    CONVERSATION_MEMBER_DEVICES: 'conversation:memberDevices',
    CONVERSATION_PUT_KEY: 'conversation:putArchiveKey',
    CONVERSATION_GET_KEY: 'conversation:getArchiveKey',
    CONVERSATION_LIST_KEYS: 'conversation:listArchiveKeys',
    CONVERSATION_SET_FLAGS: 'conversation:setFlags',
    CONVERSATION_CLEAR: 'conversation:clear',
    CONVERSATION_CREATED: 'conversation:created',
    CONVERSATION_UPDATED: 'conversation:updated',

    // users (directory lookup)

    USERS_SEARCH: 'users:search',
    USERS_PROFILES: 'users:profiles',

    // encrypted media (ciphertext in, ciphertext out - see media.service.js)

    MEDIA_REQUEST_UPLOAD: 'media:requestUpload',
    MEDIA_COMPLETE_UPLOAD: 'media:completeUpload',
    MEDIA_REQUEST_DOWNLOAD: 'media:requestDownload',
    MEDIA_ABORT_UPLOAD: 'media:abortUpload',

    // sideBar sync
    SIDEBAR_SYNC: 'sidebar:sync',
    SIDEBAR_PATCH: 'sidebar:patch',

    // chat history

    HISTORY_PAGE: 'history:page',
    HISTORY_RANGE: 'history:range',

    // messaging

    MESSAGE_SEND: 'message:send',
    MESSAGE_NEW: 'message:new',            // archive notification -> whole conversation
    MESSAGE_ENVELOPE: 'message:envelope',  // transport ciphertext -> one device
    MESSAGE_READ: 'message:read',
    MESSAGE_DELIVERED: 'message:delivered',
    MESSAGE_RECEIPT: 'message:receipt',
    MESSAGE_REVOKE: 'message:revoke',
    MESSAGE_REVOKED: 'message:revoked',
    MESSAGE_TYPING: 'message:typing',

    // offline sync

    SYNC_PULL: 'sync:pull',
    SYNC_ACK: 'sync:ack',

    // calls for v2

    CALL_INVITE: 'call:invite',
    CALL_ACCEPT: 'call:accept',
    CALL_REJECT: 'call:reject',
    CALL_SIGNAL: 'call:signal',   // SDP offer/answer + ICE candidates
    CALL_END: 'call:end'

}