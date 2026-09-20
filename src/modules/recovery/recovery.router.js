import {Router} from "express";
import {authenticate} from "../../middleware/auth.middleware.js";
import {validateVaultPayload} from "./recovery.validator.js";
import {enroll, fetchVault, vaultStatus, confirmRestore, rotate, reset} from "./recovery.controller.js";

const router = Router();

router.use(authenticate);

router.get('/vault/status', vaultStatus);
router.post('/vault', validateVaultPayload, enroll); // for signup
router.get('/vault', fetchVault);  // for login
router.post('/vault/restore', confirmRestore);
router.put('/vault', validateVaultPayload, rotate); // change recovery key
router.delete('/vault', reset);

export default router;
