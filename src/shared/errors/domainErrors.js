import {AppError} from './AppError.js'

export class NotFoundException extends AppError{
    constructor(message = 'Resource not found') {
        super(message, 404, 'RESOURCE_NOT_FOUND');

    }
}

export class UnauthorizedException extends AppError {
    constructor(message = 'Unauthorized access') {
        super(message, 401, 'UNAUTHORIZED');
    }
}

export class BadRequestException extends AppError {
    constructor(message = 'Bad request') {
        super(message, 400, 'BAD_REQUEST');
    }
}

export class ConflictException extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}

export class InvalidTokenException extends AppError {
    constructor(message = 'Invalid or expired token', errorCode = 'INVALID_TOKEN') {
        super(message, 401, errorCode);
    }
}

export class CryptoKeyException extends AppError {
    constructor(message = 'Required cryptographic key is missing', errorCode = 'CRYPTO_KEY_REQUIRED') {
        super(message, 400, errorCode);
    }
}