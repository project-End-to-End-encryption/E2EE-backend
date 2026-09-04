import {AppError} from "../shared/errors/AppError.js";

export const globalErrorHandler = (err,req,res,next) => {
    let error = err;

    if(error instanceof AppError){
        return res.status(error.statusCode).json({
            status: 'error',
            code: error.errorCode,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json({
            status: 'error',
            code: 'DUPLICATE_FIELD',
            message: `${field} already exists`,
            timestamp: new Date().toISOString(),
        });
    }

    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(el => el.message);
        return res.status(400).json({
            status: 'error',
            code: 'VALIDATION_ERROR',
            message: 'Invalid input data',
            errors: messages,
            timestamp: new Date().toISOString(),
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            code: 'TOKEN_EXPIRED',
            message: 'Access token expired',
            timestamp: new Date().toISOString(),
        });
    }

    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            code: 'INVALID_TOKEN',
            message: 'Invalid access token signature',
            timestamp: new Date().toISOString(),
        });
    }

    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            status: 'error',
            code: 'MALFORMED_JSON',
            message: 'Invalid JSON payload received',
            timestamp: new Date().toISOString(),
        });
    }

    console.error('UNHANDLED ERROR:', err);
    return res.status(500).json({
        status: 'error',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong on the server',
        timestamp: new Date().toISOString(),
    });
};