import mongoose, { isValidObjectId } from "mongoose"
import { User } from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

//* Inprogress: toggle subscription
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
    res.status(201).json(new ApiResponse(201, newSubscription, "Channel subscribed successfully."))
  }
})

//* Inprogress: controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
  const { channelId } = req.params

  if (!isValidObjectId(channelId)) {
    throw new ApiError(400, "Invalid channel ID.")
  }

  //* Fetching all subscribers to the channel
  const subscriptions = await Subscription.find({ channel: channelId }).populate('subscriber');

  if (!subscriptions.length) {
    throw new ApiError(404, "No subscriber found.")
  }

  //* Extract subscriber details
  const subscribers = subscriptions.map(subscription => subscription.subscriber)

  return res
    .status(200)
    .json(
      new ApiResponse(200, subscribers, "Channel subscriber fetched successfully.")
    )
})

//* Inprogress: controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
  const { subscriberId } = req.params;

  if (!isValidObjectId(subscriberId)) {
    throw new ApiError(400, "Invalid subscriber ID.");
  }

  //* Fetching all channels to which the user has subscribed
  const subscriptions = await Subscription.find({ subscriber: subscriberId }).populate('channel');

  if (!subscriptions.length) {
    throw new ApiError(404, "No channels found for this subscriber.");
  }

  //* Extract channel details
  const channels = subscriptions.map(subscription => subscription.channel);

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