import {getPreKeyBundle, registerKeyBundle, countOneTimePreKeys, addOneTimePreKeys} from "../../keys/keys.service.js";
import {SOCKET_EVENTS} from "../../../shared/constants/socketEvents.js";
import {withRateLimit, RATE_LIMITS} from "../../../shared/utils/rateLimiter.js";


export const registerKeyEvent = (io, socket) =>{
    const {userId, deviceId} = socket.user;

    socket.on(SOCKET_EVENTS.KEYS_REGISTER,withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async (payload,ack) =>{
            await registerKeyBundle(userId, deviceId, payload);
            ack?.({ok:true});
        }
    ));

    socket.on(SOCKET_EVENTS.KEYS_FETCH_BUNDLE, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async ({ userId: targetUserId, deviceId: targetDeviceId }, ack) => {
            const bundle = await getPreKeyBundle(targetUserId, targetDeviceId);
            ack?.({ ok: true, bundle });
        }
    ));

    socket.on(SOCKET_EVENTS.KEYS_COUNT_OTPK, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async (_payload, ack) => {
            const count = await countOneTimePreKeys(userId, deviceId);
            ack?.({ ok: true, count });
        }
    ));

    socket.on(SOCKET_EVENTS.KEYS_TOP_UP_OTPK, withRateLimit(
        'keyFetch', RATE_LIMITS.keyFetch, userId,
        async ({ oneTimePreKeys }, ack) => {
            await addOneTimePreKeys(userId, deviceId, oneTimePreKeys);
            ack?.({ ok: true, added: oneTimePreKeys.length });
        }
    ));
};