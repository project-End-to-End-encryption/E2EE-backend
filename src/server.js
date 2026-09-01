require('dotenv').config();
const connectToMongoDB = require('./config/mongo.config');
const {connectRedis} = require('./config/redis.config')

const app = require('./app')

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

