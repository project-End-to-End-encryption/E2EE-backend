import {BadRequestException} from "../../shared/errors/domainErrors.js";
import e from "express";

export const validateRegister = (req,res,next)=>{

    const {reservationId, email, password } = req.body;

    if(!reservationId || typeof reservationId !== 'string'){
        return next(new BadRequestException('ReservationId is required'));
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

    req.body.email = email.trim().toLowerCase();
    next();
}

export const validateLogin = (req,res,next)=> {
    const {email, password} = req.body;

    if(!email || typeof email !== 'string'){
        return next(new BadRequestException('Email is required'));
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if(!emailRegex.test(email.trim())){
        return next(new BadRequestException('Invalid email formate'));
    }

    if(!password || typeof password !== 'string'){
        return next(new BadRequestException('Password is required'));
    }

    req.body.email = email.trim().toLowerCase();
    next();
}