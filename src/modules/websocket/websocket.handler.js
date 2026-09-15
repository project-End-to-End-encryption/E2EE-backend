import {
    markOffline,
    markOnline,
    joinRoom
} from "../../infrastructure/websocket/connectionManager.js";
import {registerKeyEvent} from "./events/keys.event.js";
import {registerAiEvent} from "./events/ai.event.js";
import {registerGroupEvent} from "./events/group.event.js";
import {registerMessageEvents} from "./events/message.event.js";
import {deviceRoom, userRoom} from "../../shared/utils/socketRooms.js";


export const handleConnection = async (io, socket) =>{
    const {userId, deviceId} = socket.user;

    try {
        socket.join(userRoom(userId));
        if (deviceId) {
            socket.join(deviceRoom(deviceId))
        }
        await markOnline(userId, socket.id);
        await joinRoom(socket);

        registerAiEvent(io, socket);
        registerKeyEvent(io, socket);
        registerMessageEvents(io, socket);
        registerGroupEvent(io, socket);
        // all the business logic here
        // register typingEvent
        // register messageEvent
        // register sessionEvent
        // and more
    } catch (error){
        console.error(`Socket initialization failed for user ${userId}:`, error);
        socket.disconnect(true);
        return;
    }

    socket.on('disconnect', async ()=>{
        try{
            const remaining = await markOffline(userId, socket.id);

            if(remaining === 0){
                // last device gone mark user to offline business logic
            }
        } catch(error){
            console.error(`Error during disconnect cleanup for user ${userId}:`, error);
        }

    })
}