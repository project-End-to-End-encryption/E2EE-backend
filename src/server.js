import 'dotenv/config'
import connectToMongoDB from './config/mongo.config.js';
import {connectRedis}  from './config/redis.config.js';

import app from './app.js'

const PORT = process.env.PORT || 3000;

Promise.all([
    connectToMongoDB(),
    connectRedis()
]).then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server running on port: ${PORT}`)
    });
}).catch(err => {
    console.log(err)
    process.exit(1);
});

