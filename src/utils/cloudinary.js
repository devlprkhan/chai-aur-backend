import { v2 as cloudinary } from 'cloudinary'
import { extractPublicId } from 'cloudinary-build-url'
import fs from 'fs'

//? Configure Cloudinary ENV
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return;

    //* Upload file on cloudinary server
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });

    // console.log("File uploaded successfully: ", response.url);

    //* Delete local file from our local server as well
    fs.unlinkSync(localFilePath)
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath) //* Remove the locally saved temporary file as the upload operation got failed
    return null;
  }
}

const deleteFromCloudinary = async (url) => {
  try {
    if (!url) {
      console.log('No url provided for deletion');
      return;
    }

    const publicId = extractPublicId(url)

    //* Delete file from Cloudinary server
    const response = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
    });

    return response;
  } catch (error) {
    console.error("Error deleting file from Cloudinary: ", error);
    return null;
  }
}

export { uploadOnCloudinary, deleteFromCloudinary }