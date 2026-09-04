import {BadRequestException} from "../../shared/errors/domainErrors.js";

export const validateRegister = (req,res,next)=>{

    const {username, email, password } = req.body;

    if(!username || typeof username !== 'string'){
        return next(new BadRequestException('Username is required'));
    }
    if (!email || typeof email !== 'string') {
        return next(new BadRequestException('Email is required'));
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email.trim())){
        return next(new BadRequestException('Invalid email formate'))
    }
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>_+\-=\[\]\\\/]/;
    if(!password || typeof password !== 'string' || password.length < 8 || !hasSpecialChar.test(password)){
        return next(new BadRequestException('Password must be at least 8 characters long and contain at least one special character.'))
    }

    req.body.username = username.trim().toLowerCase();
    req.body.email = email.trim().toLowerCase();
    next();
}