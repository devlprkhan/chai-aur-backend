import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { API_VERSION } from "./constants.js"

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true
}));

app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public"));
app.use(cookieParser());

//* Routes Import
import userRoute from "./routes/user.routes.js";
import healthcheckRouter from "./routes/healthcheck.routes.js"
import tweetRouter from "./routes/tweet.routes.js"
import subscriptionRouter from "./routes/subscription.routes.js"
import videoRouter from "./routes/video.routes.js"
import commentRouter from "./routes/comment.routes.js"
import likeRouter from "./routes/like.routes.js"
import playlistRouter from "./routes/playlist.routes.js"
import dashboardRouter from "./routes/dashboard.routes.js"

//TODO: Make the "/api/v1/" Global constant
//* Routes Declaration
app.use(`${API_VERSION}/healthcheck`, healthcheckRouter);
app.use(`${API_VERSION}/users`, userRoute);
app.use(`${API_VERSION}/tweets`, tweetRouter);
app.use(`${API_VERSION}/subscriptions`, subscriptionRouter);
app.use(`${API_VERSION}/videos`, videoRouter);
app.use(`${API_VERSION}/comments`, commentRouter);
app.use(`${API_VERSION}/likes`, likeRouter);
app.use(`${API_VERSION}/playlist`, playlistRouter);
app.use(`${API_VERSION}/dashboard`, dashboardRouter);

export { app };