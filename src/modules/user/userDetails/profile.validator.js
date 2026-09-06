import {BadRequestException} from "../../../shared/errors/domainErrors.js";

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const validateProfile = (req,res,next) => {
    const {fullName, userBio} = req.body;

    if(!fullName || typeof fullName !== 'string'){
        return next(new BadRequestException('Full name must be in string'));
    }

    const trimmedFullName = fullName.trim();
    const trimmedBio = userBio?.trim() || '';

    if(trimmedFullName.length < 2 || trimmedFullName.length > 35){
        return next(new BadRequestException('Full name must be between 2 to 35 character'))
    }

    if(trimmedBio.length > 500 ){
        return next(new BadRequestException('Way to big Bio '))
    }
    req.body.fullName = trimmedFullName;
    req.body.userBio = trimmedBio;
    next();
}

export const validateUploadUrlRequest = (req,res,next) =>{
    const { fileName, mimeType } = req.body;

    if (!fileName || typeof fileName !== 'string') {
        return next(new BadRequestException('fileName is required'));
    }

    if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
        return next(new BadRequestException('Only JPEG, PNG, and WEBP images are allowed'));
    }

    next();
};