import {Router} from "express";
import {login, logout, refreshToken, register} from "./auth.controller.js";
import {validateLogin, validateRegister} from "./auth.validator.js";

const router = Router();

router.post('/signup', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/logout', logout);
router.post('/refresh', refreshToken)
export default router;