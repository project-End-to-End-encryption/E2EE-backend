export const userRoom = (userId) => `user:${userId}`;
export const deviceRoom = (userId, deviceId) => {
    if(!userId || !deviceId){
        throw new Error('deviceRoom requires both userId and deviceId');
    }
    return `device:${userId}:${deviceId}`;
}
export const conversationRoom = (conversationId) => `conv:${conversationId}`;

export const groupRoom = conversationRoom;