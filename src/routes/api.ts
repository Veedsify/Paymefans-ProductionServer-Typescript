import express from "express"
import auth from "@routes/auth/auth"
import feed from "@routes/feed/feed"
import profile from "@routes/profile/profile"
import post from "@routes/post/post"
import story from "@routes/story/story"
const api = express.Router()

// Authentication
api.use("/auth", auth)
// Feeds
api.use("/feeds", feed)
// Profile
api.use("/profile", profile)
// Post
api.use("/post", post)
// Story
api.use("/story", story)

export default api
