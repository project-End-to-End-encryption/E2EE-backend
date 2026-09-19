import {
    markOffline,
    markOnline,
    joinRooms
} from "../../infrastructure/websocket/connectionManager.js";
import {registerKeyEvent} from "./events/keys.event.js";
import {registerAiEvent} from "./events/ai.event.js";
import {registerMessageEvents} from "./events/message.event.js";
import {registerConversationEvents} from "./events/conversation.event.js";
import {registerSidebarEvents} from "./events/sidebar.event.js";
import {registerHistoryEvents} from "./events/history.event.js";
import {registerSyncEvents} from "./events/sync.event.js";


export const handleConnection = async (io, socket) =>{
    const {userId, deviceId} = socket.user;

    try {
        await joinRooms(socket);
        await markOnline(userId, deviceId, socket.id);

        // registration
        registerKeyEvent(io, socket);
        registerConversationEvents(io, socket);
        registerSidebarEvents(io, socket);
        registerHistoryEvents(io, socket);
        registerMessageEvents(io, socket);
        registerSyncEvents(io, socket);
        registerAiEvent(io, socket);

    } catch (error){
        console.error(`Socket initialization failed for user ${userId}:`, error);
        socket.disconnect(true);
        return;
    }

    socket.on('disconnect', async ()=>{
        try{
            const remaining = await markOffline(userId, deviceId, socket.id);

            if(remaining === 0){
                // last device gone mark user to offline business logic
            }
        } catch(error){
            console.error(`Error during disconnect cleanup for user ${userId}:`, error);
        }

    })
}