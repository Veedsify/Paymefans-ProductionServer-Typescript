import express from "express"
import AuthController from "../../controllers/AuthController.ts"
import Auth from "../../middleware/auth.ts"
import HomeFeedController from "../../controllers/HomeFeedControllers.ts"
const feed = express.Router()


// Authentication
feed.get("/home", Auth, HomeFeedController.GetHomePosts)

export default feed
