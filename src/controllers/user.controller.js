import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const resisterUser= asyncHandler( async(req,res)=>{
    const {fullName,username,email,password} = req.body
 
    //if all filelds are given correctly(not whitespaces)
    if([fullName,email,username,password].some((field)=>field?.trim()=="")){
        throw new ApiError(400,"All fields require")
    }

    //if user exists
    const existedUser=await User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User with email or username already exists")
    }

    //check if avatar given by user
    console.log(req.files);
    const avatarLocalPath= req.files?.avatar[0].path
    const coverImageLocalPath=req.files?.coverImage[0].path

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }

    //if avatar coverImage given upload to clodinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    console.log(avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    //check if avatar is created
    if(!avatar){
        throw new ApiError(400,"Avatar is required")
    }


    //create user
    const user = await User.create({
        fullName,
        avatar:avatar.url,
        coverImage:coverImage?.url || "",
        email,
        password,
        username: username.toLowercase()
    })

    const createduser= await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createduser){
        throw new ApiError(500,"something went wrong while resistering user")
    }


    return res.status(201).json(
        new ApiResponse(200,createduser,"user resistered succesfully")
    )
})

