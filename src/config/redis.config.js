import {createClient} from 'redis';

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err)=> console.log(`Redis error: ${err}`));

redisClient.on('connect', ()=> console.log(`Connected to Redis server`));

async function connectRedis(){
    if(!redisClient.isOpen){
        await redisClient.connect();
    }
    return redisClient;
}

export  {
    connectRedis,redisClient
}