import mongoose from "mongoose";
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { asyncHandler } from "../utils/asyncHandler.js"

const healthcheck = asyncHandler(async (req, res) => {
  const dbStates = ['Disconnected', 'Connected', 'Connecting', 'Disconnecting'];
  const dbStatus = dbStates[mongoose.connection.readyState];

  if (dbStatus !== 'Connected') {
    throw new ApiError(503, `The server is not running correctly due to database status: ${dbStatus}`);
  }

  res.status(200).json(new ApiResponse(200, { status: "Server is up", database: dbStatus }));
})

export { healthcheck }
