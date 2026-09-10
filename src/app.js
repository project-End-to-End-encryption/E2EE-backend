import express from 'express';
import {NotFoundException} from "./shared/errors/domainErrors.js";
import {globalErrorHandler} from "./middleware/error.middleware.js";
import routes from "./routes/index.js";
import cookieParser from 'cookie-parser'
import {BadRequestException} from "./shared/errors/domainErrors.js";
import cors from 'cors';

const corsOptions = {
    origin: "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

app.use((req, res, next) => {
    console.log(">>> REQUEST:", req.method, req.originalUrl);
    next();
});

app.use(cors(corsOptions));

app.options(/.*/, (req, res) => {
    console.log(">>> OPTIONS HANDLER HIT");

    res.header(
        "Access-Control-Allow-Origin",
        "http://localhost:5173"
    );
    res.header(
        "Access-Control-Allow-Credentials",
        "true"
    );
    res.header(
        "Access-Control-Allow-Methods",
        "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    res.sendStatus(204);
});

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

