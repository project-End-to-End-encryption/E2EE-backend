import express from 'express';
import {NotFoundException} from "./shared/errors/domainErrors.js";
import {globalErrorHandler} from "./middleware/error.middleware.js";

const app = express();

app.use(express.json());


app.get('/test', (req,res)=>{
    res.json({
        message: "Server is running"
    });
})

app.all('*', (req,res,next) => {
    next(NotFoundException(`Can't find  ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler)

export default app;

