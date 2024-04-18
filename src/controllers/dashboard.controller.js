import mongoose, { isValidObjectId } from "mongoose"
import { Video } from "../models/video.model.js"
import { Subscription } from "../models/subscription.model.js"
import { Like } from "../models/like.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user._id

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.")
  }

  //* Total subscribers
  const totalSubscribers = await Subscription.countDocuments({ channel: userId })

  //* Total videos and views
  const videoStats = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId)
      }
    },
    {
      $group: {
        _id: null,
        totalVideos: { $sum: 1 },
        totalViews: { $sum: "$view" }
      }
    }
  ]);

  //* Extracting totals from aggregation results
  const { totalVideos, totalViews } = videoStats.length > 0 ? videoStats[0] : { totalVideos: 0, totalViews: 0 };

  //* Total likes
  const totalLikes = await Like.countDocuments({
    'video': { $in: (await Video.find({ owner: userId })).map(video => video._id) }
  });

  //* Response the aggregated results
  res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { totalSubscribers, totalVideos, totalViews, totalLikes },
        "Channel stats fetched successfully."
      )
    )
})

const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.")
  }

  const videos = await Video.find({
    owner: userId
  })

  if (!videos.length) {
    throw new ApiError(404, "No video found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, videos, "Channel videos fetched successfully.")
    )
})

export {
  getChannelStats,
  getChannelVideos
}