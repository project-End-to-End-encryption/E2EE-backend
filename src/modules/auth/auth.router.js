import {Router} from "express";
import {login, register} from "./auth.controller.js";
import {validateLogin, validateRegister} from "./auth.validator.js";

const router = Router();

router.post('/signup', validateRegister, register);
router.post('/login', validateLogin, login);

export default router;