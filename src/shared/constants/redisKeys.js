export const REDIS_KEYS = {
    usernameReservation: (reservationId) => `username:reservation:${reservationId}`,
    usernameReservationById: (reservationId) => `username:reservation:id:${reservationId}`,
    userPresence: (userId) => `presence:user:${userId}`
};