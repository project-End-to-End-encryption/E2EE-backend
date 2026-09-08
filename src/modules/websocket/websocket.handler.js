import {addConnection, removeConncetion} from "../../infrastructure/websocket/connectionManager.js";

export const handleConnection = (io, socket) =>{
    const {userId} = socket.user;

    addConnection(userId, socket.id);
    // debug
    console.log(`Socket connected: user = ${userId} socketId = ${socket.id}`);

    // all the business logic here
    // register typingEvent
    // register messageEvent
    // register sessionEvent
    // and more

    socket.on('disconnect', ()=>{
        removeConncetion(userId, socket.id);
        console.log(`Socket disconnected: user = ${userId} socket = ${socket.id}`);
    })
}