import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"
import { deleteFromCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"

const getAllVideos = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, query, sortBy = 'createdAt', sortType = 'desc', userId } = req.query;
  let aggregateQuery = [];

  //* Filtering by userId if provided and valid
  if (userId && isValidObjectId(userId)) {
    aggregateQuery.push(
      {
        $match: {
          owner: new mongoose.Types.ObjectId(userId)
        }
      },
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
                _id: 1
              }
            }
          ]
        }
      }
    );
  }

  //* Simple text search in title or description if query is provided
  if (query) {
    aggregateQuery.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } },
        ],
      },
    });
  }

  //* Adding sorting to the aggregate query
  let sortDirection = sortType === 'desc' ? -1 : 1;
  aggregateQuery.push({ $sort: { [sortBy]: sortDirection } });

  //* Applying pagination
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  //* Executing the aggregate query with pagination
  const videos = await Video.aggregatePaginate(Video.aggregate(aggregateQuery), options);

  //* Returning the fetched videos
  return res.status(200).json(new ApiResponse(200, videos, "Videos fetched successfully"));
})

const publishAVideo = asyncHandler(async (req, res) => {
  //* 1: Get user data from frontend
  const { title, description } = req.body

  //* 2: Validate the data - non empty
  if ([title, description].some(field => !field || field.trim() === '')) {
    throw new ApiError(400, "All field is required")
  }

  //* 3: Check for Video & Thumbnail (If exists)
  let videoLocalPath, thumbnailLocalPath = "";

  //* Ensure req.files exists and contains the video field
  if (!req.files || !req.files.videoFile || req.files.videoFile.length === 0) {
    throw new ApiError(400, "Video file is required!");
  } else {
    videoLocalPath = req.files.videoFile[0].path;
  }

  //* Explicitly check for thumbnail's presence
  if (req.files && req.files.thumbnail && req.files.thumbnail.length > 0) {
    thumbnailLocalPath = req.files.thumbnail[0].path;
  } else {
    throw new ApiError(400, "Thumbnail is required!");
  }

  //* 4: Upload them to Cloudinary - video and thumbnail
  const video = await uploadOnCloudinary(videoLocalPath)
  const thumbnail = await uploadOnCloudinary(thumbnailLocalPath)

  //* 5: Validate the data
  if (!video || !thumbnail) {
    throw new ApiError(400, "All fields must required!")
  }

  //* 6: Create the video object entry in DB
  const videoObject = await Video.create({
    videoFile: video.url,
    thumbnail: thumbnail.url,
    title,
    description,
    duration: video.duration,
    isPublished: true,
    owner: req.user
  })

  //* 7: Return the created video object to user
  return res
    .status(201)
    .json(new ApiResponse(200, videoObject, "Video Uploaded successfully."))
})

const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  //* 1: Validate the data
  if (!videoId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  //* 2: Find the video
  //*Way#1
  // const video = await Video.findById(videoId).populate('owner')
  //*Way#2
  const video = await Video.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(videoId) //* Find the video
      }
    },
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
              _id: 1
            }
          }
        ]
      }
    },
    {
      $unwind: '$owner' //* Convert the owner field from an array to a single document
    }
  ])

  if (video.length === 0) {
    throw new ApiError(404, "Video not exits.")
  }

  //* 3: Return the video
  return res
    .status(200)
    .json(
      new ApiResponse(200, video[0], "Video fetched")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;
  const localPathThumbnail = req.file?.path;
  let updateData = {};

  //* 1: Validate the data
  if (!videoId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  //* Add title and description to updateData if provided
  if (title) updateData.title = title;
  if (description) updateData.description = description;

  //* Update the thumbnail of video if exists
  if (localPathThumbnail) {
    const thumbnailUploadResponse = await uploadOnCloudinary(localPathThumbnail);
    if (thumbnailUploadResponse && thumbnailUploadResponse.url) {
      updateData.thumbnail = thumbnailUploadResponse.url; //* Update thumbnail URL if upload successful
    }
  }

  //* 2: Update the video
  const updatedVideo = await Video.findByIdAndUpdate(videoId, { $set: updateData }, { new: true })

  if (!updatedVideo) {
    throw new ApiError(404, "Video not exits.")
  }

  //* 3: Return the video
  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedVideo, "Video updated")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params

  //* 1: Validate the data
  if (!videoId) {
    return new ApiError(400, "Please provide a proper data!");
  }

  //* 2: Find the video
  const video = await Video.findById(videoId)

  if (!video) {
    throw new ApiError(404, "Video not found")
  }


  //* 3: Delete the video
  const deletedVideo = await Video.findByIdAndDelete(videoId)

  if (!deletedVideo) {
    throw new ApiError(404, "Video not found")
  }

  //* Remove from the cloudinary
  await deleteFromCloudinary(video.videoFile)
  await deleteFromCloudinary(video.thumbnail)

  //* 4: Return the deleted video
  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedVideo, "Video deleted")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
  //* Extract videoId from request parameters
  const { videoId } = req.params;

  //* Check if videoId is not provided in the request
  if (!videoId) {
    throw new ApiError(400, "Please provide the proper data.");
  }

  //* Retrieve the current video document to get its isPublished status
  const video = await Video.findById(videoId);

  //* If no video was found and updated, throw an error
  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  //* Update the "isPublished" status
  const updatedVideo = await Video.findByIdAndUpdate(videoId,
    {
      $set:
      {
        isPublished: !video?.isPublished
      }
    },
    { new: true } //* Return the updated document
  );

  //* Respond with the updated video data
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        updatedVideo,
        "Video publish status updated successfully."
      )
    );
})

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus
}