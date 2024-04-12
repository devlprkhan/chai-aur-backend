import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//* InProgress: toggle like on video
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params
  const userId = req.user._id;

  if (!videoId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  const likedVideo = await Like.findOne({
    video: videoId,
    likedBy: userId
  })

  if (likedVideo) {
    await Like.findByIdAndDelete(likedVideo._id)
    res.status(200).json(new ApiResponse(200, {}, "Video unliked successfully."));
  } else {
    const newLike = await Like.create({
      video: videoId,
      likedBy: userId
    })

    res.status(201).json(new ApiResponse(201, newLike, "Video liked successfully."));
  }
})

//* Inprogress: toggle like on comment
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const userId = req.user._id

  if (!commentId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  const likedComment = await Like.findOne({
    comment: commentId,
    likedBy: userId
  })

  if (likedComment) {
    await Like.findByIdAndDelete(likedComment._id)
    res.status(200).json(new ApiResponse(200, {}, "Comment unliked successfully."))
  } else {
    const newLike = await Like.create({
      comment: commentId,
      likedBy: userId
    })

    res.status(201).json(new ApiResponse(201, newLike, "Comment liked successfully."))
  }
})

//* Inprogress: toggle like on tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const userId = req.user._id

  if (!tweetId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  const likedTweet = await Like.findOne({
    tweet: tweetId,
    likedBy: userId
  })

  if (likedTweet) {
    await Like.findByIdAndDelete(likedTweet._id)
    res.status(200).json(new ApiResponse(200, {}, "Tweet unliked successfully."))
  } else {
    const newLike = await Like.create({
      tweet: tweetId,
      likedBy: userId
    })

    res.status(201).json(new ApiResponse(201, newLike, "Comment liked successfully."))
  }
})

//* Inprogress: get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.")
  }

  //* Extract all liked videos of user and sort by newest first
  const likedVideos = await Like.find({ likedBy: userId, video: { $ne: null } })
    .sort({ createdAt: -1 })
    .populate('video')
    .exec()

  if (!likedVideos.length) {
    throw new ApiError(404, "No liked video found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "User liked videos fetched successfully.")
    )
})

export {
  toggleCommentLike,
  toggleTweetLike,
  toggleVideoLike,
  getLikedVideos
}