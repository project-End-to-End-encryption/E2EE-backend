export class AppError extends Error{
    constructor(message, statusCode = 500, errorCode = 'INTERNAL_SERVER_ERROR') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}