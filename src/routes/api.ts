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
import conversations from "@routes/conversations/conversations";
import comments from "@routes/comments/comment";
import notifications from "@routes/notifications/notification"
import verification from "@routes/verification/verification"
import store from "@routes/store/store"
import help from "@routes/help/help"
import webhooks from "@routes/webhooks/webhooks"
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
api.use("/conversations", conversations)
// Comments
api.use("/comments", comments)
// Notifications
api.use("/notifications", notifications)
// Stories
api.use("/stories", story)
// Verification 
api.use("/verification", verification)
// Store
api.use("/store", store)
// Help
api.use("/help", help)
// Webhooks
api.use("/webhooks", webhooks)
export default api
