import express from "express"
import Auth from "@middleware/Auth"
import ProfileController from "@controllers/ProfileController"
import { CreateUpload } from "@middleware/FileUploadConfig"
const profile = express.Router()

// Multer Instance
const uploadBanner = CreateUpload("banners")
const uploadAvatar = CreateUpload("avatars")

// Authentication
profile.post("/user", Auth, ProfileController.Profile)
profile.post("/banner/change", Auth, uploadBanner.single("banner"), ProfileController.BannerChange)
profile.post("/update", Auth, uploadAvatar.single("profile_image"), ProfileController.ProfileUpdate)
profile.get("/stats/:userId/:type", Auth, ProfileController.ProfileStats)
profile.post("/action/:action/:userId", Auth, ProfileController.FollowUnfollowUser)
profile.post("/tip/model", Auth, ProfileController.TipUser)
profile.delete("/delete-account", Auth, ProfileController.DeleteAccount)
export default profile
