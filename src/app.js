import express from 'express';
import {NotFoundException} from "./shared/errors/domainErrors.js";
import {globalErrorHandler} from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
import cookieParser from 'cookie-parser'

const app = express();

app.use(express.json());
app.use(cookieParser());


app.get('/test', (req,res)=>{
    res.json({
        message: "Server is running"
    });
})

app.use('/api/v1', routes);

app.all('*path', (req,res,next) => {
    next(NotFoundException(`Can't find  ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler)

export default app;

