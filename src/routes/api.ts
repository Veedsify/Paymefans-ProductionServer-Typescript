import express from "express"
import auth from "@routes/users/auth/auth"
import feed from "@routes/users/feed/feed"
import profile from "@routes/users/profile/profile"
import post from "@routes/users/post/post"
import story from "@routes/users/story/story"
import points from "@routes/users/points/point"
import settings from "@routes/users/settings/settings"
import model from "@routes/users/model/model"
import wallet from "@routes/users/wallet/wallet"
import follower from "@routes/users/follower/follower";
import subscribers from "./users/subscriber/subscribers"
import conversations from "@routes/users/conversations/conversations";
import comments from "@routes/users/comments/comment";
import notifications from "@routes/users/notifications/notification"
import verification from "@routes/users/verification/verification"
import store from "@routes/users/store/store"
import help from "@routes/users/help/help"
import webhooks from "@routes/users/webhooks/webhooks"
import LogOutController from "@controllers/LogoutController";
import withdraw from "@routes/users/withdraw/withdraw";
import pages from "./users/pages/pages"
import rates from "./users/rate/rate"
import configs from "@routes/users/configs/configs";
import search from "@routes/users/search/search"
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
// Withdraw
api.use("/withdraw", withdraw)
// Logout
api.post("/logout", LogOutController.Logout)
// Outer Pages
api.use("/pages", pages)
// Rates
api.use("/rates", rates)
// Configs
api.use("/configs", configs)
// Search
api.use("/search", search)
export default api
