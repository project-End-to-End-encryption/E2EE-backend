import express from "express";

import AdminService
    from "./admin.service.js";

import AdminController
    from "./admin.controller.js";

import {
    adminAuthMiddleware
} from "./admin.auth.middleware.js";


const router = express.Router();

const adminService =
    new AdminService();

const adminController =
    new AdminController(adminService);


/*
    Public admin endpoint

    POST /admin/login
*/
router.post(
    "/login",
    (req, res) =>
        adminController.login(req, res)
);


/*
    Protected admin endpoints
*/

router.post(
    "/create-account",
    adminAuthMiddleware,
    (req, res) =>
        adminController.createAccount(req, res)
);


router.patch(
    "/change-user-account-type",
    adminAuthMiddleware,
    (req, res) =>
        adminController.changeUserAccountType(req, res)
);


export default router;