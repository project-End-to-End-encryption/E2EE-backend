export const REDIS_KEYS = {
    usernameReservation: (reservationId) => `username:reservation:${reservationId}`,
    userPresence: (userId) => `presence:user:${userId}`
};