import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {RATE_LIMITS, withRateLimit} from "../../../shared/utils/rateLimiter.js";
import * as messageService from "../../messaging/message.service.js"
import * as conversationService from "../../messaging/conversation.service.js"
import {conversationRoom, deviceRoom} from "../../../shared/utils/socketRooms.js";


export const registerMessageEvents = (io, socket) => {
    const {userId, deviceId} = socket.user;

  socket.on(SOCKET_EVENTS.MESSAGE_SEND, withRateLimit(
      'messageSend', RATE_LIMITS.messageSend, userId,
      async (payload, ack) => {
          const result = await messageService.sendMessage({
              senderId: userId,
              senderDeviceId: deviceId,
              payload
          });

          if(result.duplicate) {
              return ack?.({
                  ok: true,
                  duplicates: true,
                  messageId: result.message._id.toString(),
                  seq: result.message.seq,
                  sendAt: result.message.sendAt
              });
          }
          const {message} = result;

          for(const target of result.deliverNow){
              io.to(deviceRoom(target.toUserId, target.toDeviceId))
                  .emit(SOCKET_EVENTS.MESSAGE_ENVELOPE, target.envelop);
          }

          if(result.groupPayload){
              socket.to(conversationRoom(payload.conversationId))
                  .emit(SOCKET_EVENTS.MESSAGE_ENVELOPE, {
                      kind: 'group',
                      conversationId: payload.conversationId,
                      messageId: message._id.toString(),
                      seq: message.seq,
                      clientMessageId: payload.clientMessageId,
                      from: { userId, deviceId },
                      ...result.groupPayload
                  });
          }
          socket.to(conversationRoom(payload.conversationId))
              .emit(SOCKET_EVENTS.MESSAGE_NEW, {
                  conversationId: payload.conversationId,
                  messageId: message._id.toString(),
                  seq: message.seq,
                  senderId: userId,
                  contentType: message.contentType,
                  sentAt: message.sentAt
              });
          ack?.({
              ok: true,
              duplicate: false,
              messageId: message._id.toString(),
              seq: message.seq,
              sentAt: message.sentAt,
              queued: result.queuedCount
          });
      }
  ));

  // receipts

    socket.on(SOCKET_EVENTS.MESSAGE_READ, withRateLimit(
        'receipts', RATE_LIMITS.receipts, userId,
        async ({conversationId, seq}, ack) => {
            if (!conversationId || seq === undefined) {
                return ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
            }

            const state = await conversationService.markRead(conversationId, userId, seq);

            socket.to(conversationRoom(conversationId))
                .emit(SOCKET_EVENTS.MESSAGE_RECEIPT, {
                    conversationId, userId, type: 'read', seq: state.lastReadSeq
                });
            ack?.({ok: true, lastReadSeq: state.lastReadSeq});
        }
    ));

    socket.on(SOCKET_EVENTS.MESSAGE_DELIVERED, withRateLimit(
        'receipts', RATE_LIMITS.receipts, userId,
        async ({conversationId, seq}, ack) => {
            if (!conversationId || seq === undefined) {
                return ack?.({ ok: false, error: 'INVALID_PAYLOAD' });
            }
            const state = await conversationService.markDelivered(conversationId, userId, seq);

            socket.to(conversationRoom(conversationId))
                .emit(SOCKET_EVENTS.MESSAGE_RECEIPT, {
                    conversationId, userId, type: 'delivered', seq: state.lastDeliveredSeq
                });

            ack?.({ok: true, lastDeliveredSeq: state.lastDeliveredSeq});
        }
    ));

    // message:revoke

    socket.on(SOCKET_EVENTS.MESSAGE_REVOKE, withRateLimit(
        'conversation', RATE_LIMITS.conversation, userId,
        async ({ conversationId, messageId}, ack) => {
            const revoked = await messageService.revokeMessage(messageId, userId);

            io.to(conversationRoom(conversationId))
                .emit(SOCKET_EVENTS.MESSAGE_REVOKE, {
                    conversationId, messageId, seq: revoked.seq, revokedBy: userId
                });
            ack?.({ok: true});
        }
    ));

    // typing

    socket.on(SOCKET_EVENTS.MESSAGE_TYPING, async ({conversationId, isTyping}) =>{
        if(!conversationId) return;
        if(!(await conversationService.isMember(conversationId, userId))) return;

        socket.to(conversationRoom(conversationId))
            .emit(SOCKET_EVENTS.MESSAGE_TYPING, {conversationId, userId, isTyping: !!isTyping});
    })



}