"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@middleware/auth"));
const ProfileController_1 = __importDefault(require("@controllers/ProfileController"));
const FileUploadConfig_1 = require("@middleware/FileUploadConfig");
const profile = express_1.default.Router();
// Multer Instance
const uploadBanner = (0, FileUploadConfig_1.CreateUpload)("banners");
const uploadAvatar = (0, FileUploadConfig_1.CreateUpload)("avatars");
// Authentication
profile.post("/user", auth_1.default, ProfileController_1.default.Profile);
profile.post("/banner/change", auth_1.default, uploadBanner.single("banner"), ProfileController_1.default.BannerChange);
profile.post("/update", auth_1.default, uploadAvatar.single("profile_image"), ProfileController_1.default.ProfileUpdate);
exports.default = profile;
