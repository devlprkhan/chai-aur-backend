import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js"
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { page = 1, limit = 10, sortBy = 'createdAt', sortType = 'desc' } = req.query;
  let aggregateQuery = [];

  if (!mongoose.isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID.")
  };

  aggregateQuery.push(
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId)
      }
    },
    {
      $lookup: {
        from: 'videos',
        localField: 'video',
        foreignField: '_id',
        as: 'video'
      }
    },
    {
      $unwind: '$video'  //* Unwind the video array to handle it as a single object
    },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner'
      }
    },
    {
      $unwind: '$owner'  //* Unwind the owner array to handle it as a single object
    },
    {
      $project: {
        'content': 1,
        'video': { 'title': 1, 'description': 1, 'duration': 1, 'thumbnail': 1 },
        'owner': { 'username': 1, 'avatar': 1, 'email': 1, '_id': 1 }
      }
    }
  );

  //* Adding sorting to the aggregate query
  let sortDirection = sortType === 'desc' ? -1 : 1;
  aggregateQuery.push({ $sort: { [sortBy]: sortDirection } });

  //* Applying pagination
  const options = {
    page: parseInt(page, 10),
    limit: parseInt(limit, 10),
  };

  //* Executing the aggregate query with pagination
  const comments = await Comment.aggregatePaginate(Comment.aggregate(aggregateQuery), options);

  //* Returning the fetched comments
  return res
    .status(200)
    .json(
      new ApiResponse(200, comments, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
  const user = req.user;
  const { videoId } = req.params;
  const { content } = req.body;

  if (!mongoose.isValidObjectId(videoId) || !content) {
    throw new ApiError(400, "Please provide proper details to comment.");
  }

  const comment = await Comment.create({
    content: content,
    video: videoId,
    owner: {
      _id: user._id,
      name: user.name,
      avatar: user.avatar,
      email: user.email
    }
  })

  const result = await Comment.aggregate([
    { $match: { _id: comment._id } },
    {
      $lookup: {
        from: 'videos',
        localField: 'video',
        foreignField: '_id',
        as: 'video'
      }
    },
    { $unwind: '$video' }, //* Optionally unwind if video is expected to be a single document
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner'
      }
    },
    { $unwind: '$owner' },
    {
      $project: {
        'content': 1,
        'video': { 'title': 1, 'description': 1, 'duration': 1, 'thumbnail': 1 },
        'owner': { 'username': 1, 'avatar': 1, 'email': 1, '_id': 1 }
      }
    }
  ]);

  res
    .status(201)
    .json(
      new ApiResponse(201, result[0], "Comment added to a video.")
    );
})

const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params
  const { content } = req.body

  if (!mongoose.isValidObjectId(commentId) || !content) {
    throw new ApiError(400, "Please provide proper details to update a comment.")
  }

  const updatedComment = await Comment.findByIdAndUpdate(
    commentId,
    { content: content },
    { new: true }
  );

  if (!updatedComment) {
    throw new ApiError(404, "Comment does not exist.");
  }

  const result = await Comment.aggregate([
    { $match: { _id: updatedComment._id } },
    {
      $lookup: {
        from: 'videos',
        localField: 'video',
        foreignField: '_id',
        as: 'video'
      }
    },
    { $unwind: '$video' },
    {
      $lookup: {
        from: 'users',
        localField: 'owner',
        foreignField: '_id',
        as: 'owner'
      }
    },
    { $unwind: '$owner' },
    {
      $project: {
        'content': 1,
        'video': { 'title': 1, 'description': 1, 'duration': 1, 'thumbnail': 1 },
        'owner': { 'username': 1, 'avatar': 1, 'email': 1, '_id': 1 }
      }
    }
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(200, result[0], "Comment Updated.")
    );
})

const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params

  if (!mongoose.isValidObjectId(commentId)) {
    throw new ApiError(400, "Please provide proper details to delete a comment.")
  }

  const deletedComment = await Comment.findByIdAndDelete(commentId);

  if (!deletedComment) {
    throw new ApiError(404, "Comment does not exist.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "Comment deleted.")
    );
})

export {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
}