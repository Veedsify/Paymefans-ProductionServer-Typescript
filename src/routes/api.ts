import express from "express"
import AuthController from "../controllers/AuthController.ts"
import auth from "./auth/auth.ts"
import feed from "./feed/feed.ts"
import profile from "./profile/profile.ts"
const api = express.Router()


// Authentication
api.use("/auth", auth)

// Feeds
api.use("/feeds", feed)

// Profile
api.use("/profile", profile)




export default api
