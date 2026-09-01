const mongoose = require("mongoose");

const connectToMongoDB = async ()=>{
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);

        console.log(`Connected to MongoDB server on ${conn.connection.host}`);
    } catch (error){
        console.error(`Database Connection Error: ${error.message}`);
        process.exit(1);
    }
}

mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected!');
});

mongoose.connection.on('error', (err) => {
    console.error(`MongoDB connection error: ${err}`);
});

module.exports = connectToMongoDB;