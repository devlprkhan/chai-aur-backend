import mongoose, { Schema } from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: Schema.Types.ObjectId,
      ref: "User" //* One who is subscribing the channel
    },
    channel: {
      type: Schema.Types.ObjectId,
      ref: "User" //* One to whom "Subscriber" is subscribing
    }
  },
  {
    timestamps: true
  }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);