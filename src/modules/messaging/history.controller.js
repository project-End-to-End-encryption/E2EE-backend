import {asyncHandler} from "../../shared/utils/asyncHandler.js";
import {SuccessResponse} from "../../shared/utils/response.js";
import * as messageService from "./message.service.js"
import * as conversationService from "./conversation.service.js"

/** Bulk history
 * this will be on REST not on web-sockets
 */

const currentUserId = (req) => req.user?.userId;

// we will work on this later