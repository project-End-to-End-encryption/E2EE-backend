import {registerKeyBundle} from "../../keys/keys.service.js";

export const registerKeyEvent = (io, socket) =>{
    const {userId} = socket.user;

    socket.on('keys:register', async (payload, ack)=>{
        try{
            await registerKeyBundle(userId,payload);
            ack?.({ok: true});
        } catch (error) {
            ack?.({ok: false, error: error.message})
        }
    });
};