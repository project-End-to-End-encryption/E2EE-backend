export const userRoom = (userId) => `user:${userId}`;
export const deviceRoom = (userId, deviceId) => `device:${userId}:${deviceId}`;
export const groupRoom = (groupId) => `group${groupId}`;