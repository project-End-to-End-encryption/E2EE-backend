import express from 'express';
import {NotFoundException} from "./shared/errors/domainErrors.js";
import {globalErrorHandler} from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
import cookieParser from 'cookie-parser'
import {BadRequestException} from "./shared/errors/domainErrors.js";
const app = express();

app.use(express.json());
app.use(cookieParser());

app.use((req, res, next) => {
    if (req.body === undefined) req.body = {};
    next();
});

app.use((req, res, next) => {
    const skip = ['/api/auth/logout'];
    if (
        ['POST', 'PUT', 'PATCH'].includes(req.method) &&
        req.body === undefined &&
        !skip.includes(req.path)
    ) {
        return next(new BadRequestException('Request body is required'));
    }
    next();
});


app.get('/test', (req,res)=>{
    res.json({
        message: "Server is running"
    });
})

app.use('/api/v1', routes);

app.all('*path', (req,res,next) => {
    next(new NotFoundException(`Can't find  ${req.originalUrl} on this server`));
});

app.use(globalErrorHandler)

export default app;

