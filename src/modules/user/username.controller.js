import {asyncHandler} from "../../shared/utils/asyncHandler.js";
import MongoUserRepository from "../../repositories/implementations/mongodb/mongo.user.repository.js";
import usernameService from "./username.service.js";

const userRepository = new MongoUserRepository();

const userService = new usernameService(userRepository);

export const checkUsername = asyncHandler(async (req,res) => {
    const {username} = req.body;

    const result = await userService.checkAndReserveUsername(username);

    res.status(200).json({
        status: 'success',
        message: 'Username is available and reserved for 15 minutes',
        data: result
    });
});