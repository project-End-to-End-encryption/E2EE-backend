import {Router} from "express";
import usernameRoutes from "../modules/user/userName/username.routes.js";
import authRouter from "../modules/auth/auth.router.js";
import profileRoutes from "../modules/user/userDetails/profile.routes.js";
import recoveryRoutes from "../modules/recovery/recovery.router.js";

const router = Router();

router.use('/users', usernameRoutes);
router.use('/users', profileRoutes);
router.use('/auth', authRouter);
router.use('/recovery', recoveryRoutes);
export default router;