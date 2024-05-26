import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import User from "../models/user.models.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
    try {
        let token;
        
        // Check if the token is in cookies or the Authorization header
        if (req.cookies && req.cookies.accessToken) {
            token = req.cookies.accessToken;
        } else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
            token = req.headers.authorization.replace("Bearer ", "");
        }

        if (!token) {
            throw new ApiError(401, "Access token is missing from cookies or Authorization header");
        }

        const payLoad = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);//will give the payload

        const user = await User.findById(payLoad?._id).select("-password -refreshToken");//payLoad?._id -->from the payload object we are taking id,

        if (!user) {
            throw new ApiError(401, "Invalid access token");
        }

        req.user = user;
        next();
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid access token");
    }
});
