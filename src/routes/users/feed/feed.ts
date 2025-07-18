import express from "express"
import Auth from "@middleware/Auth"
import HomeFeedController from "@controllers/HomeFeedControllers"
const feed = express.Router()


// Authentication
feed.get("/home", Auth, HomeFeedController.GetHomePosts)

export default feed
