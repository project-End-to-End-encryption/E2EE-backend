import {
    markOffline,
    markOnline
} from "../../infrastructure/websocket/connectionManager.js";

export const handleConnection = async (io, socket) =>{
    const {userId} = socket.user;

    socket.join(`user:${userId}`); // room membership
    await markOnline(userId, socket.id);

    // all the business logic here
    // register typingEvent
    // register messageEvent
    // register sessionEvent
    // and more

    socket.on('disconnect', async ()=>{
        const remaining = await markOffline(userId, socket.id);

        if(remaining === 0){
            // last device gone mark user to offline business logic
        }
    })
}