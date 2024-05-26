import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            throw new ApiError(404, "User not found");
        }

        const accessToken =await  user.generateAccessToken();
        const refreshToken =await user.generateRefreshToken(); //the expiry of accessToken is 1d and refreshToken is 10d, intially while await was not used
        //before any token, accessToken was printing it's value and refreshToken was returning a promise, after using "await user.generateRefreshToken()" solved the poblem

        console.log("a ", accessToken, " b ", refreshToken);
        user.refreshToken = refreshToken;
        await user.save({ validateBeforeSave: false });

        return { accessToken, refreshToken };
    } catch (error) {
        console.error("Error generating tokens:", error);
        throw new ApiError(500, "Failed to generate tokens");
    }
};


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

    //check if avatarfilepath from localdisk is given by user
    // console.log(req.files);
    const avatarLocalPath= req.files?.avatar[0].path
    const coverImageLocalPath=req.files?.coverImage[0].path

    
    if(!coverImageLocalPath){

    }

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file path is required")
    }

    //if avatar coverImage given upload to clodinary
    console.log("avatarLocalPath ", avatarLocalPath);
    const avatar = await uploadOnCloudinary(avatarLocalPath)//this will give the the information after uploading on cloudinary
    console.log("avatar ", avatar);

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    console.log("coverImage ",coverImage);

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
        username: username.toLowerCase()
    })

    //find user after creation
    const createduser= await User.findById(user._id).select( //inside select the fields will not be shown to clint, but saved to database
        "-password -refreshToken"  //The minus sign (-) before the field names indicates that these fields should not be included in the returned document.
    )

    if(!createduser){
        throw new ApiError(500,"something went wrong while resistering user")
    }


    return res.status(201).json(
        new ApiResponse(200,createduser,"user resistered succesfully")
    )

})


export const loginuser = asyncHandler( async(req,res)=>{
    const {email,password,username} = req.body;

    console.log("djnf",req.body);
    if((!username && !email)  || !password){
        throw new ApiError(400, "email or username is required and password is must required")
    }

    // const user= await User.findOne({email, username}) //this will find if both email and username is correct

    const user= await User.findOne({ $or: [ {email}, {username} ]})

    if(!user){
        throw new ApiError(400,"User not found")
    }
 
    const checkPassword= await user.isPasswordCorrect(password)

    if(!checkPassword){
        throw new ApiError(400,"Password is incorrect")
    }

    const {accessToken,refreshToken} = await   generateAccessAndRefreshTokens(user._id)

    //here we need to again retrive the data of user as in generateAccessAndRefreshTokens() the user is updated
    const loggedInuser = await User.findById(user._id).select( "-password -refreshToken")

    const options={
        httpOnly:true,
        secure:true
    }

    return res.status(200).cookie("accessToken", accessToken,options).cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(201,{loggedInuser,accessToken,refreshToken},"user logged in successfully")//the reason for sending accessToken,refreshToken cause it might be useful for many cases like for monile development where we do not have access to cookie
    )
   
})


export const logoutUser = asyncHandler( async(req,res)=>{
        const userId=req.user._id //req.user already set from auth middleware

        //to logout we are removing refreshToken from db by making it undefined
        await User.findByIdAndUpdate(userId,{refreshToken: undefined},{new:true})

        //now delete cookie
        const options={
            httpOnly:true,
            secure:true
        }

        return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
        .json(new ApiResponse(200,{},"user logged out succesfully"))
})


export const refreshAccessToken = asyncHandler( async(req,res)=>{
     const OldrRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken //this OldrRefreshToken is valid and not expired, just because the access token
     //is expired and form clint an request is coming to refresh both tokens, 

     if(!OldrRefreshToken){
         throw new ApiError(400,"Refresh token missing")
     }

     let payload;
     try {
         payload = jwt.verify(OldrRefreshTokenldRefreshToken, process.env.REFRESH_TOKEN_SECRET);
     } catch (error) {
         throw new ApiError(401, "Invalid refresh token");
     }

     const userId=payload._id;

     const user=User.findById(userId).select("-password -refreshToken")

     if(!user){
        throw new ApiError(400,"User is not verified")
     }

     if(OldrRefreshToken !== user.refreshToken){//this validation is not reqired altough as if OldrRefreshToken is valid certaily it will match the db's refreshtoken
        throw new ApiError(400,"Refresh Token did not match")
     }

     const options={
        httpOnly:true,
        secure:true
     }

     const {accessToken , refreshToken} = await generateAccessAndRefreshTokens(userId)

     return res.send(200).cookie("accessToken", accessToken,options).cookie("refreshToken",refreshToken,options)
     .json(new ApiResponse(200,{user,accessToken,refreshToken}),"Tokens refreshed")
})