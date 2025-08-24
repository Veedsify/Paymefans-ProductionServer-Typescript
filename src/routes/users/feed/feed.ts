import express from "express"
import Auth from "@middleware/Auth"
import HomeFeedController from "@controllers/HomeFeedControllers"
import Paths from "@utils/paths"
const feed = express.Router()


// Authentication
feed.get(Paths.API.Feed.Home, Auth, HomeFeedController.GetHomePosts)

export default feed
