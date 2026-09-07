import {createClient} from 'redis';
import dotenv from 'dotenv'
dotenv.config()

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err)=> console.log(`Redis error: ${err}`));

redisClient.on('connect', ()=> console.log(`Connected to Redis server`));

export  default redisClient;