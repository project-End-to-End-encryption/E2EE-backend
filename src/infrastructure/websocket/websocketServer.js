import {Server} from "socket.io";
import {authenticateSocket} from "../../modules/websocket/websocket.auth.js";
import {handleConnection} from "../../modules/websocket/websocket.handler.js";

export const initWebsocketServer = (httpServer) =>{
    const io = new Server(httpServer,{
        cors: {
            origin : process.env.CLIENT_URL,
            credentials: true
        }
    });

    io.use(authenticateSocket);

    io.on('connection', (socket) => {
        handleConnection(io,socket)
    });
    return io;
};