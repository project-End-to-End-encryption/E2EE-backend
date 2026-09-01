require('dotenv').config();
const connectToMongoDB = require('./config/mongo.config');
const app = require('./app')

const PORT = process.env.PORT || 3000;

connectToMongoDB().then(()=>{
    app.listen(PORT, ()=>{
        console.log(`Server running on port: ${PORT}`)
    });
});

