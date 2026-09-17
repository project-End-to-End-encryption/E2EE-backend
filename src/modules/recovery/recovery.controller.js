import {asyncHandler} from "../../shared/utils/asyncHandler.js";
import {SuccessResponse, CreateResponse, ErrorResponse} from "../../shared/utils/response.js";
import * as recoveryService from './recovery.service.js'

const currentUserId = (req) => req.user?.userId;

export const enroll = asyncHandler(async (req, res) => {
    const result = await recoveryService.enrollVault(currentUserId(req), req.body);
    res.status(201).json(new CreateResponse('Recovery Vault created', result));
});

export const fetchVault = asyncHandler(async (req,res) => {
    const vault = await recoveryService.getVault(currentUserId(req));
    res.status(200).json(new SuccessResponse('Recovery vault',vault));
});

export const confirmRestore = asyncHandler(async (req,res) => {
    await recoveryService.markRestored(currentUserId(req));
    res.status(200).json(new SuccessResponse('Restore recorded', null));
});

export const rotate = asyncHandler(async (req,res) => {
    const result = await recoveryService.rotateRecoveryKey(currentUserId(req),req.body);
    res.status(200).json(new SuccessResponse('Recovery key rotated', result));
});

/**
 * Destructive. The client MUST show an unambiguous confirmation before calling
 * this, and the explicit body flag is a second guard against an accidental
 * fetch() firing it.
 */

export const reset = asyncHandler(async (req,res)=>{
    if(req.body?.confirm !== 'DELETE_MY_HISTORY'){
        return res.status(400).json(
            new ErrorResponse(400,'Confirmation required', 'CONFIRMATION_REQUIRED')
        );
    }
    const result = await recoveryService.resetVault(currentUserId(req));
    res.status(200).json(new SuccessResponse('Recovery vault reset', result));
});
