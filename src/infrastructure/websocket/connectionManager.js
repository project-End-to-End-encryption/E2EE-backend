const userSockets = new Map();

export const addConnection = (userId, socketId) =>{
    if(!userSockets.has(userId)){
        userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socketId);
}

export const removeConncetion = (userId, socketId) =>{
    userSockets.get(userId)?.delete(socketId);

    if(userSockets.get(userId)?.size === 0) {
        userSockets.delete(userId);
    }
}

export const getSocketForUser = (userId) => [
    ...(userSockets.get(userId) || [])
];