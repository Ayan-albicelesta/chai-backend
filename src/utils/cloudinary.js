import {v2 as cloudinary} from 'cloudinary';
import fs from 'fs'
          
cloudinary.config({ 
  cloud_name: 'dnqmfam5g', 
  api_key: '917417437294522', 
  api_secret: 'HH4TBe8p9kb2KFGHPDion__IhC8' 
});

 

const uploadOnCloudinary= async function(localFilePath){
  try {
    console.log("Cloudinary Config:", {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET  
    });
    if (!localFilePath) throw new Error("File path is missing");

    // Check if file exists
    if (!fs.existsSync(localFilePath)) {
      throw new Error(`File not found at path: ${localFilePath}`);
    }

    console.log("Uploading file at path:", localFilePath);

    const response = await cloudinary.uploader.upload(localFilePath, { resource_type: "auto" });
    console.log("File uploaded on Cloudinary:", response.url);

    // Remove the local file after successful upload
    

    return response;
  } catch (error) {
    console.error('ERROR while uploading on Cloudinary:', error.message);
    
    // Ensure the local file is only removed on upload failure
    fs.unlinkSync(localFilePath);

    return null;
  }
}

export {uploadOnCloudinary}