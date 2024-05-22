import mongoose, {Schema} from "mongoose";
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const userSchema=new Schema({
    username:{
        type:String,
        unique:true,
        required:true,
        lowercase:true,
        trime:true,
        index:true//index is for optmised search, internally it uses alogorithm
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    fullName:{
        type:String,
        required:true,
        trim:true,
        index:true
    },
    avatar:{
        type:String
    },
    coverImage: {
        type: String, //cloudinary
    },
    watchHistory:[
        {
            type:Schema.Types.ObjectId,
            ref:"Video"
        }
    ],
    password:{
        type:String,
        required:[true,"Password is required"]
    },
    refreshToken:{
        type:String
    }

},{timestamps:true})

userSchema.pre('save',async function(next){
    if (this.isModified('password') || this.isNew) {
        const salt = await bcrypt.genSalt(10); // 10 is the salt rounds
        this.password = await bcrypt.hash(this.password, salt);
      }
    return next();
})

userSchema.methods.isPasswordCorrect=async function(password){
    return await bcrypt.compare(password,this.password)//return boolen value
}

userSchema.methods.generateAccessToken= async function(){
   return jwt.sign({_id:this._id,email:this.email,username:this.username,fullName:this.fullName},process.env.ACCESS_TOKEN_SECRET,{algorithm:'RS256'},{ expiresIn: process.env.ACCESS_TOKEN_EXPIRY})//default algo-RS256 if not explicitly mentioned
}

userSchema.methods.generateRefreshToken= async function(){
    return jwt.sign({ _id:this._id },  process.env.REFRESH_TOKEN_SECRET, {  expiresIn: process.env.REFRESH_TOKEN_EXPIRY})//here alogrithm is not mentioned, default algo-RS256
}

const User=mongoose.model("User",userSchema)

export default User