import express from "express";
import Auth from "@middleware/Auth";
import ProfileController from "@controllers/ProfileController";
import { CreateUpload } from "@middleware/FileUploadConfig";
import Paths from "@utils/paths";
import ProfileViewsMiddleware from "@middleware/ProfileViewsMiddleware";
const profile = express.Router();

// Multer Instance
const uploadBanner = CreateUpload("banners");
const uploadAvatar = CreateUpload("avatars");

// Authentication
profile.post(
  Paths.API.Profile.User,
  ProfileViewsMiddleware,
  ProfileController.Profile,
);
profile.post(
  Paths.API.Profile.BannerChange,
  Auth,
  uploadBanner.single("banner"),
  ProfileController.BannerChange,
);
profile.post(
  Paths.API.Profile.Update,
  Auth,
  uploadAvatar.single("profile_image"),
  ProfileController.ProfileUpdate,
);
profile.get(Paths.API.Profile.Stats, Auth, ProfileController.ProfileStats);
profile.post(
  Paths.API.Profile.Action,
  Auth,
  ProfileController.FollowUnfollowUser,
);
profile.post(Paths.API.Profile.TipModel, Auth, ProfileController.TipUser);
profile.delete(
  Paths.API.Profile.DeleteAccount,
  Auth,
  ProfileController.DeleteAccount,
);
export default profile;
