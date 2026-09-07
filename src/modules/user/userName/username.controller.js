import {asyncHandler} from "../../../shared/utils/asyncHandler.js";
import MongoUserRepository from "../../../repositories/implementations/mongodb/mongo.user.repository.js";
import usernameService from "./username.service.js";
import {SuccessResponse,} from "../../../shared/utils/response.js";


const userRepository = new MongoUserRepository();

const userService = new usernameService(userRepository);

export const checkUsername = asyncHandler(async (req,res) => {
    const {username} = req.body;

    const result = await userService.checkAndReserveUsername(username);

    res.status(200).json(
        new SuccessResponse(
            'Username is available and reserved for 15 minutes',
            result
        )
    )
});