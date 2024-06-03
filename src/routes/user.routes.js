import  {resisterUser, loginuser,logoutUser,refreshAccessToken, changeCurrentPassword, updateAccountDetails, updateUserAvatar, updateUserCoverImage, getUserChannelProfile, getWatchHistory, getCurrentUser} from '../controllers/user.controller.js'
import  {upload} from '../middlewares/multer.middleware.js'
import { verifyJWT } from '../middlewares/auth.middleware.js';

import { Router } from "express";

const userRouter=Router();

userRouter
.route('/resister')
.post(upload.fields([ //uploading multiple file through multer
    {
        name:'avatar',
        maxCount:1
    },
    {
        name:'coverImage',
        maxCount:1
    }
]), resisterUser)

userRouter.route("/login").post(loginuser)

userRouter.route('/logout').post(verifyJWT,logoutUser)

userRouter.route("/current-user").get(verifyJWT, getCurrentUser)

userRouter.route("/refresh-token").post(refreshAccessToken)

userRouter.route("/change-password").post(verifyJWT, changeCurrentPassword)

userRouter.route("/update-account").patch(verifyJWT,updateAccountDetails)

userRouter.route("/avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)

userRouter.route("/coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)

userRouter.route("/c/:username").get(verifyJWT,getUserChannelProfile)

userRouter.route("/history").get(verifyJWT,getWatchHistory)

 
export default userRouter;