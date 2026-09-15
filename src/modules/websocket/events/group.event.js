import {createGroup, addMember, removeMember, getGroupMemberDevices} from "../../messaging/group.service.js";
import {userRoom, groupRoom} from "../../../shared/utils/socketRooms.js";

export const registerGroupEvent = (io, socket) => {
    const {userId} = socket.user;

    socket.on('group:create', async ({name, memberUserIds}, ack) => {
        try{
            const group = await createGroup(userId, {name, memberUserIds});
            const roomId = groupRoom(group._id.toString());
            socket.join(roomId);
            (memberUserIds || []).forEach(memberId => io.in(userRoom(memberId)).socketsJoin(roomId));
            ack?.({ok: true, group})
        } catch (error){
            ack?.({ok: false, error: error.message});
        }
    });

    socket.on('group:addMember', async ({groupId, newUserId}, ack) => {
        try{
            const group = await addMember(groupId, userId, newUserId);
            io.in(userRoom(newUserId)).socketsJoin(groupRoom(groupId));
            ack?.({ok: true, group});
        } catch (error) {
            ack?.({ok: false, error: error.message})
        }
    });

    socket.on('group:removeMember', async ({groupId, targetUserId}, ack) => {
       try{
           const group = await removeMember(groupId, userId, targetUserId);
           io.in(userRoom(targetUserId)).socketsLeave(groupRoom(groupId));
           ack?.({ok: true, group})
       } catch (error){
           ack?.({ok: false, error: error.message})
       }
    });
    socket.on('group:getMemberDevice', async ({groupId, deviceId}, ack) => {
        try{
            const devices = await getGroupMemberDevices(groupId, userId, deviceId);
            ack?.({ok: true, devices});
        } catch (error) {
            ack?.({ok: false, error: error.message});
        }
    })
}