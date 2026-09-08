import 'dotenv/config'
import http from 'http';
import connectToMongoDB from './config/mongo.config.js';
import redisClient from "./config/redis.config.js";
import app from './app.js'
import MinioStorageRepository from "./repositories/implementations/minio/minio.storage.repository.js";
import {initWebsocketServer} from "./infrastructure/websocket/websocketServer.js";

const PORT = process.env.PORT || 3000;
const storageRepository = new MinioStorageRepository();

const httpServer = http.createServer(app);

Promise.all([
    connectToMongoDB(),
    redisClient.connect(),
    storageRepository.init()
]).then( async ()=>{

    await initWebsocketServer(httpServer);

    httpServer.listen(PORT, ()=>{
        console.log(`Server running on port: ${PORT}`)
    });
}).catch(err => {
    console.log(err)
    process.exit(1);
});

