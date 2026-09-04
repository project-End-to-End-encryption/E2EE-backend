import {Router} from "express";
import {register} from "./auth.controller.js";
import {validateRegister} from "./auth.validator.js";

const router = Router();

router.post('/signup', validateRegister, register);

export default router;