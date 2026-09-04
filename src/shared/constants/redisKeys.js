export const REDIS_KEYS = {
    usernameLock: (username) => `lock:username:${username.toLowerCase().trim()}`
};