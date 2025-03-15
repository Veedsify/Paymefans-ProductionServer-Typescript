import express from "express"
import Auth from "../../middleware/auth.ts"
import ProfileController from "../../controllers/ProfileController.ts"
import { CreateUpload } from "../../middleware/FileUploadConfig.ts"
const profile = express.Router()

// Multer Instance
const uploadBanner = CreateUpload("banners")
const uploadAvatar = CreateUpload("avatars")

// Authentication
profile.post("/user", Auth, ProfileController.Profile)
profile.post("/banner/change", Auth, uploadBanner.single("banner"), ProfileController.BannerChange)
profile.post("/update", Auth, uploadAvatar.single("profile_image"), ProfileController.ProfileUpdate)
export default profile
