import {Router} from "express";
import {completeProfile, getProfilePictureUploadUrl} from "./profile.controller.js";
import {validateProfile, validateUploadUrlRequest} from "./profile.validator.js";
import {authenticate} from "../../../middleware/auth.middleware.js";

const router = Router();

router.post('/profile/picture/upload-url', authenticate, validateUploadUrlRequest, getProfilePictureUploadUrl);

router.patch('/profile', authenticate, validateProfile, completeProfile);

export default router;