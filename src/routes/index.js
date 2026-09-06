import {Router} from "express";
import usernameRoutes from "../modules/user/userName/username.routes.js";
import authRouter from "../modules/auth/auth.router.js";
import profileService from "../modules/user/userDetails/profile.service.js";
import profileRoutes from "../modules/user/userDetails/profile.routes.js";

const router = Router();

router.use('/users', usernameRoutes);
router.use('/users', profileRoutes);
router.use('/auth', authRouter);
export default router;