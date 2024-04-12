import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"

//? Cookie options (use for avoid modification on front-end site)
const cookieOptions = { httpOnly: true, secure: true }

const generateTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    //* Add the refresh token inside the user collection
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false })

    return { accessToken, refreshToken }

  } catch (error) {
    throw new ApiError(500, "Something went wrong while generating the tokens!")
  }
}

const registerUser = asyncHandler(async (req, res) => {

  //* 1: Get user data from frontend
  const { username, email, fullName, password } = req.body;

  //* 2: Validate the data - non empty
  if ([username, email, fullName, password].some(field => !field || field.trim() === "")) {
    throw new ApiError(400, "All fields must be required!")
  }

  //* 3: Check if user already
  const isUserExisted = await User.findOne({ $or: [{ username }, { email }] })
  if (isUserExisted) {
    throw new ApiError(409, "This username or email already exists!")
  }

  //* 4: Check for image - avatar, coverImage (If exists)
  let avatarLocalPath, coverImageLocalPath = "";

  //* Ensure req.files exists and contains the avatar field
  if (!req.files || !req.files.avatar || req.files.avatar.length === 0) {
    throw new ApiError(400, "Avatar file is required!");
  } else {
    avatarLocalPath = req.files.avatar[0].path;
  }

  //* Explicitly check for coverImage's presence
  if (req.files && req.files.coverImage && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  //* 5: Upload them to Cloudinary - avatar and cover image
  const avatar = await uploadOnCloudinary(avatarLocalPath)
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

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

const loginUser = asyncHandler(async (req, res) => {

  //* 1: Get the user {email or username, password}
  const { email, username, password } = req.body;

  //* 2: Validate the data
  if (!email && !username && !password) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  //* 3: Find the user
  const user = await User.findOne({ $or: [{ email }, { username }] })

  if (!user) {
    throw new ApiError(404, "User not exits.")
  }


  //* 4: Validate Password
  const isValidPassword = await user.isPasswordCorrect(password)

  if (!isValidPassword) {
    throw new ApiError(401, "Invalid credentials.")
  }


  //* 5: Generate the {Access & Refresh} tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  //? Pull the updated user data because the old "user" does not contain the "refreshToken"
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  //* 6: Send the response and cookies

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken }, "User logged in successfully.")
    )
});

const logoutUser = asyncHandler(async (req, res) => {

  //* Remove the refreshToken from user collection
  //? How do we get the access of "user"?
  //* We inject the "user" object through the middleware (auth)

  User.findByIdAndUpdate(req?.user?._id,
    {
      $unset: {
        refreshToken: 1
      }
    },
    {
      new: true
    }
  )

  //* Clear the cookies (accessToken, refreshToken) as well
  res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(
      new ApiResponse(200, {}, "User logged out.")
    )
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

  if (!incomingRefreshToken) {
    throw new ApiError(400, "Refresh token is required!")
  };

  try {
    const decodeToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decodeToken?._id).select("-password");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token!");
    };

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used!")
    }

    const { accessToken, newRefreshToken } = await generateTokens(user._id);

    return res.
      status(200).
      cookie("accessToken", accessToken, cookieOptions).
      cookie("refreshToken", newRefreshToken, cookieOptions).
      json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken
          },
          "Tokens refreshed successfully."
        )
      )

  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token")
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old password and new password are required!")
  }

  const user = await User.findById(req.user._id);


  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  if (!isPasswordCorrect) {
    throw new ApiError(401, "Password is not valid!");
  }

  user.password = newPassword;

  await user.save({ validateBeforeSave: true });

  return res.
    status(200)
    .json(
      new ApiResponse(200, {}, "Password updated successfully.")
    );

});

const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(
      200,
      req.user,
      "User fetched successfully"
    ))
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;

  if (!fullName || !email) {
    throw new ApiError(400, "Please provide data to be updated!")
  }

  console.log('Checker:----------->', fullName, email);

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        fullName,
        email
      }
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User details updated successfully."));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const currentAvatarPath = req.user?.avatar;
  const localAvatarPath = req.file?.path;

  if (!localAvatarPath) {
    return new ApiError(400, "Please provide a avatar path to be updated!");
  };

  const avatar = await uploadOnCloudinary(localAvatarPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar");
  };

  await deleteFromCloudinary(currentAvatarPath);

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        avatar: avatar.url
      }
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "User Avatar updated successfully."));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
  const currentCoverImagePath = req.user?.coverImage;
  const localCoverImagePath = req?.file?.path;

  if (!localCoverImagePath) {
    return new ApiError(400, "Please provide a cover image path to be updated!");
  };

  const coverImage = await uploadOnCloudinary(localCoverImagePath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar");
  };

  await deleteFromCloudinary(currentCoverImagePath);

  const user = await User.findByIdAndUpdate(
    req?.user?._id,
    {
      $set: {
        coverImage: coverImage.url
      }
    },
    { new: true }
  ).select("-password");

  res
    .status(200)
    .json(new ApiResponse(200, user, "User cover image updated successfully."));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "Please provide a username!")
  }

  const channel = await User.aggregate([
    {
      //* Find the user
      $match: {
        username: username?.toLowerCase()
      }
    },
    {
      //* Get the subscribers
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers"
      }
    },
    {
      //* Get the subscriptions
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo"
      }
    },
    {
      //* Add the subscriber count and the subscription count to the user object
      $addFields: {
        subscriberCount: {
          $size: "$subscribers"
        },
        subscriptions: {
          $size: "$subscribedTo"
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false
          }
        },
      }
    },
    {
      //* Filter out the required fields from the founded user object
      $project: {
        fullName: 1,
        username: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscriberCount: 1,
        subscriptions: 1,
        isSubscribed: 1
      }
    }
  ])

  console.log("Filtered Channel: ", channel)

  if (!channel?.length) {
    throw new ApiError(404, "Channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully.")
    )
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id)
      }
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  }
                }
              ]
            }
          },
          {
            $addFields: {
              owner: {
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
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully."
      )
    )
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateUserDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};