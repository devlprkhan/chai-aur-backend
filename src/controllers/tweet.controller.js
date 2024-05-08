import mongoose, { isValidObjectId } from "mongoose"
import { Tweet } from "../models/tweet.model.js"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body

  if (!content) {
    throw new ApiError(400, "Please provide the content to tweet.")
  }

  const tweet = await Tweet.create({
    content: content,
    owner: req.user
  })

  res
    .status(201)
    .json(
      new ApiResponse(200, tweet, "Tweet created successfully.")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
  let userId = req.params.userId;

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.");
  }

  //* Extract all tweet and sort by newer first
  const tweets = await Tweet.find({ owner: userId })
    .sort({ createdAt: -1 })
    .populate('owner', 'username fullName avatar')
    .exec();

  if (!tweets.length) {
    throw new ApiError(404, "No tweet found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, tweets, "User tweets fetched successfully.")
    );
})

const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params
  const { content } = req.body

  if (!tweetId && !content) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  const updatedTweet = await Tweet.findByIdAndUpdate(
    tweetId,
    {
      content: content
    },
    {
      new: true
    }
  )
    .populate('owner', 'username fullName avatar')
    .exec();

  if (!updatedTweet) {
    throw new ApiError(404, "Tweet not exits.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, updatedTweet, "Tweet updated")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params

  if (!tweetId) {
    throw new ApiError(400, "Please provide the proper data.")
  }

  const deletedTweet = await Tweet.findByIdAndDelete(tweetId)
    .populate('owner', 'username fullName avatar')
    .exec();

  if (!deletedTweet) {
    throw new ApiError(404, "Tweet not found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedTweet, "Tweet deleted")
    )
})

export {
  createTweet,
  getUserTweets,
  updateTweet,
  deleteTweet
}