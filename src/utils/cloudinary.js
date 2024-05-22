import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs';
          
cloudinary.config({ 
  cloud_name:process.env.CLOUDINARY_CLOUD_NAME, 
  api_key: process.env.CLOUDINARY_API_KAY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary= async function(localFilePath){
    try {
            if(!localFilePath) return null;

            const response=await cloudinary.uploader.upload(localFilePath,{resource_type:"auto"});
            console.log("file uploaded on clodinary", response.url);
            return response

    } catch (error) {
        fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation got failed
        console.log('ERROR while uploading on cloudinary');
        return null
    }
}

export {uploadOnCloudinary}