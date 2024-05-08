import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//* Take a look there is something else which is not right like the "subscriber & channel" is contain duplicate same value etc
const toggleSubscription = asyncHandler(async (req, res) => {
  const { channelId } = req.params
  const userId = req.user._id

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID.")
  }

  const subscribedChannel = await Subscription.findOne({ subscriber: userId, channel: channelId })

  if (subscribedChannel) {
    //* Delete if found
    await Subscription.findByIdAndDelete(subscribedChannel._id)
    res.status(200).json(new ApiResponse(200, {}, "Channel unsubscribed successfully."));
  } else {
    //* Create new subscription
    const newSubscription = await Subscription.create({
      subscriber: userId,
      channel: channelId
    })

    const detailedSubscription = await Subscription.aggregate([
      {
        $match: {
          _id: newSubscription._id
        }
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "subscriber",
          as: "subscriber",
        }
      },
      {
        $unwind: "$subscriber"
      },
      {
        $lookup: {
          from: "users",
          foreignField: "_id",
          localField: "channel",
          as: "channel",
        }
      },
      {
        $unwind: "$channel"
      },
      {
        $project: {
          _id: 1,
          subscriber: {
            _id: 1,
            username: 1,
            avatar: 1,
            fullName: 1,
          },
          channel: {
            _id: 1,
            username: 1,
            avatar: 1,
            fullName: 1,
          },
          createdAt: 1,
          updatedAt: 1
        }
      }
    ])

    console.log('Checker 1: ---------------', detailedSubscription);

    res.status(201).json(new ApiResponse(201, detailedSubscription[0], "Channel subscribed successfully."))
  }
})

const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params


  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid channel ID.")
  }

  //* Fetching all subscribers to the channel
  const subscribers = await Subscription.aggregate([
    {
      $match: {
        subscriber: new mongoose.Types.ObjectId(subscriberId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "subscriber",
        foreignField: "_id",
        as: "subscriber"
      }
    },
    {
      $unwind: "$subscriber" // Convert owner from array to object
    },
    {
      $project: {
        _id: "$_id",
        username: "$subscriber.username",
        avatar: "$subscriber.avatar",
        fullName: "$subscriber.fullName"
      }
    }
  ])

  if (!subscribers.length) {
    throw new ApiError(404, "No subscriber found.")
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Channel subscriber fetched successfully.")
    )
})

const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { channelId } = req.params;


  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid subscriber ID.");
  }

  //* Fetching all channels to which the user has subscribed
  const channels = await Subscription.aggregate([
    {
      $match: {
        channel: new mongoose.Types.ObjectId(channelId)
      }
    },
    {
      $lookup: {
        from: "users",
        localField: "channel",
        foreignField: "_id",
        as: "channel"
      }
    },
    {
      $unwind: "$channel" // Convert owner from array to object
    },
    {
      $project: {
        _id: "$_id",
        username: "$channel.username",
        avatar: "$channel.avatar",
        fullName: "$channel.fullName"
      }
    }
  ])

  if (!channels.length) {
    throw new ApiError(404, "No channels found for this subscriber.");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channels, "Subscribed channels fetched successfully.")
    );
})

export {
  toggleSubscription,
  getUserChannelSubscribers,
  getSubscribedChannels
}