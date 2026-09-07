import {Router} from "express";
import {checkUsername} from "./username.controller.js";
import {validateCheckUsername} from "./user.validator.js";

const router = Router();

router.post('/check-username', validateCheckUsername, checkUsername);

export default router;