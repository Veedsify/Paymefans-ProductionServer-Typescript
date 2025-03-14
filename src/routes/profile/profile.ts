import express from "express"
import Auth from "../../middleware/auth.ts"
import ProfileController from "../../controllers/ProfileController.ts"
import { CreateUpload } from "../../middleware/FileUploadConfig.ts"
const profile = express.Router()

// Multer Instance
const uploadBanner = CreateUpload("banners")

// Authentication
profile.post("/user", Auth, ProfileController.Profile)
profile.post("/banner/change", Auth, uploadBanner.single("banner"), ProfileController.BannerChange)

export default profile
