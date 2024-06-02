import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import User from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";


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

    //check if avatarfilepath from localdisk is available
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

export const getCurrentUser = asyncHandler(async(req, res) => {
    return res
    .status(200)
    .json(new ApiResponse(
        200,
        req.user,
        "User fetched successfully"
    ))
})


export const changeCurrentPassword = asyncHandler(async(req, res) => {
    const {oldPassword, newPassword} = req.body

    if (!oldPassword || !newPassword) {
        throw new ApiError(400, "Old password and new password are required");
    }

    const user = await User.findById(req.user?._id)
    if(!user){
        throw new ApiError(400,"User is not verified")
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "old password did not match")
    }

    // await User.findByIdAndUpdate(req.user._id, { password: newPassword }); //instead of this line we can write below two lines to update password also
    user.password = newPassword
    await user.save({validateBeforeSave: false})////when this is triggered passsword hasing function will be called
 
    return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))
})


export const updateAccountDetails = asyncHandler(async(req, res) => {
    const {fullName, email} = req.body

    //*****************this is code if email or password or both needs to be updated *****************
    /*if (!fullName && !email) {
        throw new ApiError(400, "At least one field is required to update")
    }

    const fieldsToBeUpdated={}
    if (req.body?.fullName) fieldsToBeUpdated.fullName=fullName;
    if (req.body?.email) fieldsToBeUpdated.email=email;
     
   const user= await User.findByIdAndUpdate(req.user?._id,fieldsToBeUpdated,{ new:true , select: "-password -refreshToken" }) //here select is chained along with new, we could have done seperatly
   */


   //****************************************this case is we update both fullname and email******************
   if (!fullName || !email) {
    throw new ApiError(400, "All fields are required")
   }

   const user = await User.findByIdAndUpdate(
       req.user?._id,
        { $set: { fullName, email: email } }, //using $set is a good practice, we could have written only {fullName, email}
      {new: true}
    
    ).select("-password")
     
    if(!user){
        throw new ApiError(400,"User not found")
    }
    
    return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
});



export const updateUserAvatar = asyncHandler(async(req, res) => {
     
    const avatarFilePath = req.file?.path;
    if(!avatarFilePath){
        throw new ApiError(400,"Avatar file is missing")
    }

    let avatar;
    try {//just being more accurate to handle error for this case, if not handled no issue
        avatar = await uploadOnCloudinary(avatarFilePath);
    } catch (error) {
        throw new ApiError(500, "Error while uploading avatar");
    }

    if(!avatar.url){
        throw new ApiError(400,"Error while uploading avatar")
    }

    const user= await User.findByIdAndUpdate(req.user?._id,{ $set:{ avatar:avatar.url } },{ new:true , select: "-password -refreshToken"})

    if(!user){
        throw new ApiError(400,"User not found")
    }


    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})



export const updateUserCoverImage = asyncHandler(async (req, res) => {
    const coverImageLocalPath = req.file?.path;
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing");
    }

    let coverImage;
    try {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
    } catch (error) {
        throw new ApiError(500, "Error while uploading cover image");
    }

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading cover image");
    }

    const user = await User.findByIdAndUpdate(req.user?._id, { $set: { coverImage: coverImage.url } },{ new: true, select: "-password -refreshToken" });

    if (!user) {
        throw new ApiError(404, "User not found");
    }

    return res.status(200).json(
        new ApiResponse(200, user, "Cover image updated successfully")
    );
});



export const  getUserChannelProfile = asyncHandler( async(req,res)=>{
    const {username} = req.params

    if(!username?.trim()){
        throw new ApiError(400,"username is missing")
    }

    const channel = await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        {
            $lookup:{
                from:"subscriptions", //lower case and plural
                localField:"_id",
                foreignField:"channel",  // 
                as:"subscribers" //one single channel is subscribed by many subscriber,to calculte total subscribers of one channel we need to find total
                //documents where the "channel" is matched (total documents of the single channel will give total subscriber)
            }
        },
        {
            $lookup:{
                from:"subscriptions", //lower case and plural
                localField:"_id",
                foreignField:"subscriber",  //assume it as a single subscriber
                as:"subscribedTo" //one single sunscriber can subsribe to many channel, to calculate total channel subscribed by one user we have to find total documents
                //documents of where "subscriber" is matched
            }
        },
        {
            $addFields:{
                subscribersCount:{ $size: "$subscribers"},
                channelsSubscribedToCount: {$size : "$subscribedTo"},
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])


    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200, channel[0], "User channel fetched successfully")
    )
})
 
 
export  const getWatchHistory=asyncHandler(async(req,res)=>{
        console.log(req.user._id)//this will give the the id number not like that --> ObjetId("the id nyumber")
        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)//
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [ //reason behind using sub-pipline is, that watchHistory is an array, there will be many dcouments of videos in "watchHistory" array, so to get user of each "videos" document we have to apply inner pipline, not outside cause if ue have used lookup outside the "user" lookup would have applied on the whole "watchhistory" array but we want to get "owner" of each videos not ht videos array
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",
                                pipeline: [
                                    {
                                        $project: {
                                            username: 1,
                                            fullName: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                owner: {//owner was alreay a field in array form, we are overridding that with object as in the pipline we are using addFiled
                                    $first: "$owner"
                                }
                            }
                        }
                    ]
                }
            }
        ]);
    
    
        return res
                .status(200)
                .json(
                    new ApiResponse(200,user[0].watchHistory,"watch history fetched successfully")
                )
    
   
})