import {getPreKeyBundle, registerKeyBundle} from "../../keys/keys.service.js";

export const registerKeyEvent = (io, socket) =>{
    const {userId, deviceId} = socket.user;

    socket.on('keys:register', async (payload, ack)=>{
        try{
            await registerKeyBundle(userId, deviceId, payload);
            ack?.({ok: true});
        } catch (error) {
            ack?.({ok: false, error: error.message})
        }
    });

    socket.on('keys:fetchBundle', async ({userId: targetUserId, deviceId: targetDeviceId}, ack) => {
        try{
            const bundle = await getPreKeyBundle(targetUserId, targetDeviceId);
            ack?.({ok: true, bundle});
        } catch (error) {
            ack?.({ok: false, error: error.message});
        }
    });
};