const express = require('express')

const app = express();

app.use(express.json());


app.get('/test', (req,res)=>{
    res.json({
        message: "Server is running"
    });
})

module.exports = app;

// deployment test

// deployment test2