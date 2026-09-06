import {AppError} from "../shared/errors/AppError.js";
import {ErrorResponse} from "../shared/utils/response.js";
import multer from "multer";

export const globalErrorHandler = (err,req,res,next) => {

    // application error
    if(err instanceof AppError){
        return res.status(err.statusCode).json(
            new ErrorResponse(
                err.statusCode,
                err.message,
                {
                    errorCode: err.errorCode
                }
            )
        );
    }

    // MongoDB Duplicate Key error
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue)[0];
        return res.status(409).json(
            new ErrorResponse(
                409,
                `${field} already exists`,
                {
                    errorCode: 'DUPLICATE_FIELD'
                }
            )
        );
    }

    // Mongoose Validation Error
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(el => el.message);
        return res.status(400).json(
            new ErrorResponse(
                400,
                'Invalid input data',
                {
                    errorCode: 'VALIDATION_ERROR',
                    details: messages
                }
            )
        );
    }

    // JWT Expired
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json(
            new ErrorResponse(
                401,
                'Access token expire',
                {
                    errorCode: 'TOKEN_EXPIRED'
                }
            )
        );
    }


    // JWT INVALID
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json(
            new ErrorResponse(
                401,
                'Invalid access token',
                {
                    errorCode: 'INVALID_TOKEN'
                }
            )
        );
    }

    // Multer error
    if(err instanceof multer.MulterError){
        return res.status(400).json(
            new ErrorResponse(
                400,
                'File upload error',
                {
                    errorCode: 'TO_LARGE_FILE'
                }
            )
        );
    }

    // Malformed json
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json(
            new ErrorResponse(
                400,
                'Invalid JSON payload received',
                {
                    errorCode: 'MALFORMED_JSON'
                }
            )
        );
    }

    console.error('UNHANDLED ERROR:', err);
    return res.status(500).json(
        new ErrorResponse(
            500,
            'Something went wrong on the server',
            {
                errorCode: 'INTERNAL_SERVER_ERROR'
            }
    ));
};