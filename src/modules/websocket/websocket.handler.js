import {
    markOffline,
    markOnline
} from "../../infrastructure/websocket/connectionManager.js";
import {registerKeyEvent} from "./events/keys.event.js";
import {registerAiEvent} from "./events/ai.event.js";

export const handleConnection = async (io, socket) =>{
    const {userId} = socket.user;

    socket.join(`user:${userId}`); // room membership
    await markOnline(userId, socket.id);

    registerAiEvent(io, socket);
    registerKeyEvent(io, socket);
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