class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.statusCode = statusCode;
        this.success = statusCode < 400;
        this.message = message;
        this.data = data;
        this.timestamp = new Date().toISOString();
    }
}

export class SuccessResponse extends ApiResponse {
    constructor(message, data = null) {
        super(200, message, data);
    }
}

export class CreateResponse extends ApiResponse {
    constructor(message, data = null) {
        super(201, message, data);
    }
}

export class ErrorResponse extends ApiResponse {
    constructor(statusCode, message, error = null) {
        super(statusCode, message, null);
        this.error = error;
    }
}