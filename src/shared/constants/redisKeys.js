export const REDIS_KEYS = {
    usernameReservation: (reservationId) => `username:reservation:${reservationId}`,
    usernameReservationById: (reservationId) => `username:reservation:id:${reservationId}`,
    userPresence: (userId) => `presence:user:${userId}`,

    // which device of the user holds a live socket
    // deliver now or queue will de decided here only
    devicePresence: (userId) => `presence:devices:${userId}`,

    // sliding-window counter for rate limiting
    rateLimit: (bucket, id) => `rl:${bucket}:${id}`,

    // Short-lived cache of conversation membership
    conversationMembers: (conversationId) => `conv:members:${conversationId}`

};

export const REDIS_TTL = {
    conversationMembers: 300,   // 5 minutes
    devicePresence: 3600 // refreshed on every connect
}