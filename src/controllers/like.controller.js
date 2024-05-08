import mongoose, { isValidObjectId } from "mongoose"
import { Like } from "../models/like.model.js"
import { Video } from "../models/video.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

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

    const detailedLike = await Like.aggregate([
      {
        $match: { _id: newLike._id }
      },
      {
        $lookup: {
          from: 'videos',
          foreignField: '_id',
          localField: 'video',
          as: 'video'
        }
      },
      {
        $unwind: "$video"
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'likedBy',
          as: 'likedBy'
        }
      },
      {
        $unwind: "$likedBy"
      },
      {
        $project: {
          video: {
            title: 1,
            description: 1,
            duration: 1,
            thumbnail: 1
          },
          likedBy: {
            username: 1,
            avatar: 1,
            email: 1
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    ])

    res.status(201).json(new ApiResponse(201, detailedLike[0], "Video liked successfully."));
  }
})

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

    const detailLike = await Like.aggregate([
      {
        $match: { _id: newLike._id }
      },
      {
        $lookup: {
          from: "comments",
          foreignField: "_id",
          localField: "comment",
          as: "comment"
        }
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'likedBy',
          as: 'likedBy'
        }
      },
      {
        $unwind: "$comment"
      },
      {
        $unwind: "$likedBy"
      },
      {
        $project: {
          _id: 1,
          createdAt: 1,
          updatedAt: 1,
          comment: {
            _id: "$comment._id",
            content: "$comment.content",
          },
          likedBy: {
            _id: "$likedBy._id",
            username: "$likedBy.username",
            avatar: "$likedBy.avatar",
            fullName: "$likedBy.fullName",
          },
        }
      }
    ]);

    res.status(201).json(new ApiResponse(201, detailLike[0], "Comment liked successfully."))
  }
});

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

    const detailedLike = await Like.aggregate([
      {
        $match: { _id: newLike._id }
      },
      {
        $lookup: {
          from: 'users',
          foreignField: '_id',
          localField: 'likedBy',
          as: 'likedBy'
        }
      },
      {
        $unwind: "$likedBy"
      },
      {
        $lookup: {
          from: 'tweets',
          foreignField: '_id',
          localField: 'tweet',
          as: 'tweet',
          pipeline: [
            {
              $lookup: {
                from: 'users',
                localField: "owner",
                foreignField: "_id",
                as: "owner",
              },
            },
            { $unwind: "$owner" },
            {
              $project: {
                content: 1,
                _id: 1,
                owner: {
                  fullName: 1,
                  username: 1,
                  avatar: 1,
                }
              }
            }
          ]
        }
      },
      {
        $unwind: "$tweet"
      },
      {
        $project: {
          tweet: {
            content: 1,
            _id: 1,
            owner: 1
          },
          likedBy: {
            username: 1,
            avatar: 1,
            email: 1
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    ])

    res.status(201).json(new ApiResponse(201, detailedLike[0], "Tweet liked successfully."));
  }
})

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.")
  }

  const likedVideos = await Like.aggregate([
    { $match: { likedBy: userId, video: { $ne: null } } },
    {
      $lookup: {
        from: 'videos',
        localField: 'video',
        foreignField: '_id',
        as: 'video'
      }
    },
    { $unwind: '$video' }, //* Unwind the array if only one video is expected per like
    {
      $lookup: {
        from: 'users',
        localField: 'likedBy',
        foreignField: '_id',
        as: 'likedBy'
      }
    },
    { $unwind: '$likedBy' }, //* Unwind the array if only one user is expected per like
    { $sort: { createdAt: -1 } }, // Sort the results by creation time
    {
      $project: {
        video: {
          title: 1,
          description: 1,
          duration: 1,
          thumbnail: 1
        },
        likedBy: {
          username: 1,
          avatar: 1,
          email: 1
        },
        createdAt: 1
      }
    }
  ]);

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