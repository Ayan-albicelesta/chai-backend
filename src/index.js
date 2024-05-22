// require('dotenv').config({path: './env'})

import dotenv from "dotenv"; 
dotenv.config({ 
})

import connectDB from "./db/db.js";

import app from "./app.js";


connectDB()
.then(()=>{
  app.listen(process.env.PORT || 8000,()=>{
    console.log(`server is listening on port ${process.env.PORT}`);
  })
})
.catch((err)=>{
  console.log("Databse conection error ",err);
})






/*
import mongoose from "mongoose";  

import { DB_NAME } from "./constants.js";

import express from "express"
const app=express()

;(async ()=>{
    try {
       await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
       app.on("error",(error)=>{
          console.log(`MONGODB cannot connect to database!!`,error);
          throw error
       })

       app.listen(process.env.PORT,()=>{
         console.log(`APP is listening on port ${process.env.PORT}`);
       })
        
    } catch (error) {
        console.error("ERROR",error)
        throw error
    }  
})();
*/
