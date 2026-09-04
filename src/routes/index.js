import {Router} from "express";
import usernameRoutes from "../modules/user/username.routes.js";
import authRouter from "../modules/auth/auth.router.js";

const router = Router();

router.use('/users', usernameRoutes);
router.use('/auth', authRouter);

export default router;