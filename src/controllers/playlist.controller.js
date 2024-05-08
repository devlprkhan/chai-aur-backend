import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js"
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";


const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body
  const user = req.user;

  if (!name) {
    throw new ApiError(400, "Please provide the proper data to create the playlist.")
  }

  const playlist = await Playlist.create({
    name,
    description,
    owner: user
  })

  res
    .status(201)
    .json(
      new ApiResponse(200, playlist, "Playlist created successfully.")
    )
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params

  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID.")
  }

  const playlist = await Playlist.aggregate([
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
        as: "owner"
      }
    },
    {
      $unwind: "$owner" // Convert owner from array to object
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos"
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName",
        },
        videos: {
          $map: {
            input: "$videos",
            as: "video",
            in: {
              _id: "$$video._id",
              videoFile: "$$video.videoFile",
              thumbnail: "$$video.thumbnail",
              title: "$$video.title",
              description: "$$video.description",
              duration: "$$video.duration",
              view: "$$video.view"
            }
          }
        }
      }
    }
  ])

  if (!playlist.length) {
    throw new ApiError(404, "No playlist found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "User playlists fetched successfully.")
    )
});

const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID.");
  }

  const playlist = await Playlist.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(playlistId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner"
      }
    },
    {
      $unwind: "$owner" // Convert owner from array to object
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos"
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName",
        },
        videos: {
          $map: {
            input: "$videos",
            as: "video",
            in: {
              _id: "$$video._id",
              videoFile: "$$video.videoFile",
              thumbnail: "$$video.thumbnail",
              title: "$$video.title",
              description: "$$video.description",
              duration: "$$video.duration",
              view: "$$video.view"
            }
          }
        }
      }
    }
  ])

  if (!playlist) {
    throw new ApiError(404, "Playlist not exits.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlist, "Playlist fetched.")
    )
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid ID's.")
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found.");
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: videoId } },
    { new: true, runValidators: true }
  ).populate('videos');

  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found.");
  }

  res
    .status(200)
    .json(
      { message: 'Video added to playlist successfully', updatedPlaylist }
    );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params

  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid ID's.")
  }

  const updatedPlaylist = await Playlist.findByIdAndDelete(
    playlistId,
    { $pull: { videos: videoId } },
    { new: true }
  ).populate('videos')

  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not found or video not in playlist.");
  }

  res
    .status(200)
    .json(
      new ApiResponse(200, updatedPlaylist, "Video removed from playlist.")
    )
});

const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID.")
  }

  const deletedPlaylist = await Playlist.findByIdAndDelete(playlistId)

  if (!deletedPlaylist) {
    throw new ApiError(404, "Playlist not found")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedPlaylist, "Playlist deleted successfully.")
    )
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params
  const { name, description } = req.body
  const updatedData = {}

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID.")
  }

  if (name) updatedData.name = name
  if (description) updatedData.description = description

  const updatedPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $set: updatedData },
    { new: true }
  )

  if (!updatedPlaylist) {
    throw new ApiError(404, "Playlist not exits.")
  }

  const playlistDetails = await Playlist.aggregate([
    {
      $match: {
        _di: updatePlaylist._id
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner"
      }
    },
    {
      $unwind: "$owner"
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos"
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        description: 1,
        owner: {
          _id: "$owner._id",
          username: "$owner.username",
          avatar: "$owner.avatar",
          fullName: "$owner.fullName"
        },
        videos: {
          $map: {
            input: "$videos",
            as: "video",
            in: {
              _id: "$$video._id",
              videoFile: "$$video.videoFile",
              thumbnail: "$$video.thumbnail",
              title: "$$video.title",
              description: "$$video.description",
              duration: "$$video.duration",
              view: "$$video.view"
            }
          }
        }
      }
    }
  ])

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlistDetails[0], "Playlist Updated.")
    )
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist
};