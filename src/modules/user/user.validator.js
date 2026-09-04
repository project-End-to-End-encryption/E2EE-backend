import {BadRequestException} from "../../shared/errors/domainErrors.js";

export const validateCheckUsername = (req,res,next) => {
    const { username } = req.body;

    if(!username || typeof username !== 'string'){
        return next(new BadRequestException('Username must be in string'));
    }

    const trimmed = username.trim();

    if(trimmed.length < 3 || trimmed.length > 30){
        return next(new BadRequestException('Username must be between 3 and 30 characters'));
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/
    if(!usernameRegex.test(trimmed)){
        return next(new BadRequestException('Username can only contain letters, numbers, and underscores'));
    }

    req.body.username = trimmed;
    next();
}