import {Router} from "express";
import usernameRoutes from "../modules/user/username.routes.js";

const router = Router();

router.use('/users', usernameRoutes);

export default router;