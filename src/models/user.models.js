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

userSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName
        },
         process.env.ACCESS_TOKEN_SECRET,
        {
            algorithm:"HS256",// and the algorithms are two type asymetric and symetric
            //here process.env.ACCESS_TOKEN_SECRET, is a randomly generated string so it supports symetric algorithm,
            //if you give alsorithm like RS256 that is asymetric will not work and give error

            //If you want to switch to asymmetric encryption with RSA keys (RS256 algorithm),
            // you'll need to generate an RSA key pair, not randomly generated secret key, and use the private key for signing the token.Store the private key 
            //securely (e.g., in an environment variable process.env.ACCESS_TOKEN_SECRET).
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}

userSchema.methods.generateRefreshToken= async function(){
    return  jwt.sign({ _id:this._id },  process.env.REFRESH_TOKEN_SECRET, {  expiresIn: process.env.REFRESH_TOKEN_EXPIRY})//here alogrithm is not mentioned, default algo-RS256
}

const User=mongoose.model("User",userSchema)

export default User