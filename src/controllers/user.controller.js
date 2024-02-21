import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

const registerUser = asyncHandler(async (req, res) => {

  //* 1: Get user data from frontend
  const { username, email, fullName, password } = req.body;
  console.log("Data: ", username, email, fullName, password)

  //* 2: Validate the data - non empty
  if ([username, email, fullName, password].some(field => field?.trim() === "")) {
    throw new ApiError(400, "All fields must be required!")
  }

  //* 3: Check if user already
  const isUserExisted = await User.findOne({ $or: [{ username }, { email }] })
  if (isUserExisted) {
    throw new ApiError(409, "This username or email already exists!")
  }

  //* 4: Check for image - avatar, coverImage (If exists)
  console.log("Passed files: ", JSON.stringify(req.files, null, 2))
  const avatarLocalPath = req.files?.avatar[0]?.path;
  const coverImageLocalPath = req.files?.coverImage[0]?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required!")
  }

  //* 5: Upload them to Cloudinary - avatar and cover image
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath)
  console.log("Uploaded files: ", JSON.stringify(avatar, coverImage, null, 2))

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required!");
  }

  //* 6: Create user object - create entry in DB
  const user = await User.create({
    username: username.toLowerCase(),
    email,
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    password,
  })

  //* 7: Check user created & remove password and refresh token field from response
  const createdUser = await User.findById(user.id).select("-password -refreshToken")

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user!");
  }

  //* 8: Return response
  return res.status(201).json(new ApiResponse(200, createdUser, "User created successfully."))

});

export { registerUser }