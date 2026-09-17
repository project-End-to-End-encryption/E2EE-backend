
import {deviceRoom, groupRoom} from "../../../shared/utils/socketRooms.js";

export const registerMessageEvents = (io, socket) => {
    const {userId} = socket.user;

    socket.on('message:direct', (envelope, ack) => {
        try{
            const {to, from} = envelope || {};
            if(!to.userId || !to.deviceId || !from?.deviceId) throw new Error('INVALID_ENVELOP');

            io.to(deviceRoom(to.userId, to.deviceId)).emit('message:direct', {
                ...envelope,
                from: {userId, deviceId: envelope.from?.deviceId}
            });
            ack?.({ok: true});
        } catch (error){
            ack?.({ok: false, error: error.message})
        }
    });

}