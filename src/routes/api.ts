import express from "express"
import auth from "@routes/auth/auth"
import feed from "@routes/feed/feed"
import profile from "@routes/profile/profile"
import post from "@routes/post/post"
import story from "@routes/story/story"
import points from "@routes/points/point"
import settings from "@routes/settings/settings"
import model from "@routes/model/model"
import wallet from "@routes/wallet/wallet"
import follower from "@routes/follower/follower";
import subscribers from "./subscriber/subscribers"
const api = express.Router()

// Authentication
api.use("/auth", auth)
// Feeds
api.use("/feeds", feed)
// Profile
api.use("/profile", profile)
// Post
api.use("/post", post)
//Points
api.use("/points", points)
// Story
api.use("/story", story)
// Settings
api.use("/settings", settings)
// Models
api.use("/models", model)
// Wallet & Transactions & Banks
api.use("/wallet", wallet)
//Subscriber 
api.use("/subscribers", subscribers)
// Followers
api.use("/follower", follower)
// Conversations

export default api
