import {isGroupMember} from "../../messaging/group.service.js";
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

    socket.on('message:group', async (payload, ack) => {
        try{
            const {groupId} = payload || {};
            if(!groupId) throw new Error('INVALID_PAYLOAD');
            if(!(await isGroupMember(groupId, userId))) throw new Error('NOT_A_GROUP_MEMBER');

            socket.to(groupRoom(groupId)).emit('message:group', {
                ...payload, fromUserId: userId
            });
            ack?.({ok: true});
        } catch (error){
            ack?.({ok: false, error: error.message});
        }
    })
}