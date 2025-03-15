import express from "express"
import auth from "./auth/auth.ts"
import feed from "./feed/feed.ts"
import profile from "./profile/profile.ts"
import post from "./post/post.ts"
const api = express.Router()

// Authentication
api.use("/auth", auth)
// Feeds
api.use("/feeds", feed)
// Profile
api.use("/profile", profile)
// Post
api.use("/post", post)


export default api
