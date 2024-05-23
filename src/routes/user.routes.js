import  {resisterUser, loginuser} from '../controllers/user.controller.js'
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

userRouter
.route("login")
.post(loginuser)

userRouter
.route('/logout')
.post(verifyJWT,logoutUser)

export default userRouter;