import {Server} from "socket.io";
import {createAdapter} from "@socket.io/redis-adapter";
import redisClient from "../../config/redis.config.js";
import {authenticateSocket} from "../../modules/websocket/websocket.auth.js";
import {handleConnection} from "../../modules/websocket/websocket.handler.js";

export const initWebsocketServer = async (httpServer) =>{
    const io = new Server(httpServer,{
        cors: {
            origin : process.env.CLIENT_URL,
            credentials: true
        }
    });

    const pubClient = redisClient.duplicate();
    const subClient = redisClient.duplicate();
    await Promise.all([pubClient.connect(),subClient.connect()]);

    io.adapter(createAdapter(pubClient,subClient));

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        handleConnection(io,socket)
    });
    return io;
};