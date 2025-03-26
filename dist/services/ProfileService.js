"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("@utils/prisma"));
const UploadImageToS3_1 = require("@libs/UploadImageToS3");
class ProfileService {
    // Get Profile
    static Profile(username) {
        return __awaiter(this, void 0, void 0, function* () {
            const user_name = username.replace(/%40/g, "@");
            const user = yield prisma_1.default.user.findFirst({
                where: {
                    username: user_name,
                },
                select: {
                    id: true,
                    username: true,
                    name: true,
                    fullname: true,
                    user_id: true,
                    admin: true,
                    role: true,
                    is_active: true,
                    is_verified: true,
                    website: true,
                    country: true,
                    location: true,
                    city: true,
                    zip: true,
                    post_watermark: true,
                    total_followers: true,
                    total_following: true,
                    total_subscribers: true,
                    email: true,
                    profile_image: true,
                    profile_banner: true,
                    bio: true,
                    Subscribers: {
                        select: {
                            subscriber_id: true,
                        },
                    },
                },
            });
            if (!user) {
                return { message: "User not found", status: false };
            }
            return { message: "User found", status: true, user };
        });
    }
    // Change Banner
    static BannerChange(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const file = req.file; // Use Multer's file object
            let url = "";
            function SaveBannerToDb(BannerUrl) {
                return __awaiter(this, void 0, void 0, function* () {
                    url = BannerUrl;
                    yield prisma_1.default.user.update({
                        where: {
                            id: user === null || user === void 0 ? void 0 : user.id,
                        },
                        data: {
                            profile_banner: BannerUrl,
                        },
                    });
                });
            }
            const options = {
                file: file,
                folder: "banners",
                contentType: "image/jpeg",
                resize: { width: 1950, height: 650, fit: "cover", position: "center" },
                deleteLocal: true,
                saveToDb: true,
                onUploadComplete: (BannerUrl) => SaveBannerToDb(BannerUrl),
                format: "webp",
                quality: 100,
            };
            yield (0, UploadImageToS3_1.UploadImageToS3)(options);
            return { message: "Banner updated", status: true, url };
        });
    }
    static ProfileUpdate(req) {
        return __awaiter(this, void 0, void 0, function* () {
            const { user } = req;
            const file = req.file; // Use Multer's file object
            let url = "";
            if (!file || file == undefined) {
                yield this.ProfileUpdateInfo(req.body, user === null || user === void 0 ? void 0 : user.user_id);
                return { message: "Profile updated", status: true, url: "" };
            }
            const SaveAvatarToDb = (AvatarUrl) => __awaiter(this, void 0, void 0, function* () {
                url = AvatarUrl;
                yield prisma_1.default.user.update({
                    where: {
                        id: user === null || user === void 0 ? void 0 : user.id,
                    },
                    data: {
                        profile_image: AvatarUrl,
                    },
                });
                yield ProfileService.ProfileUpdateInfo(req.body, user === null || user === void 0 ? void 0 : user.user_id);
            });
            const options = {
                file: file,
                folder: "avatars",
                contentType: "image/jpeg",
                resize: { width: 200, height: 200, fit: "cover", position: "center" },
                deleteLocal: true,
                saveToDb: true,
                onUploadComplete: (AvatarUrl) => SaveAvatarToDb(AvatarUrl),
                format: "webp",
                quality: 80,
            };
            yield (0, UploadImageToS3_1.UploadImageToS3)(options);
            return { message: "Avatar updated", status: true, url };
        });
    }
    // Update Profile Info
    static ProfileUpdateInfo(_a, userId_1) {
        return __awaiter(this, arguments, void 0, function* ({ name, location, bio, website, email, username }, userId) {
            try {
                const checkEmail = yield prisma_1.default.user.findUnique({
                    where: {
                        email: email,
                    },
                });
                if (checkEmail && checkEmail.user_id !== userId) {
                    return false;
                }
                const updateUser = yield prisma_1.default.user.update({
                    where: {
                        user_id: userId,
                    },
                    data: {
                        name: name,
                        location: location,
                        bio: bio,
                        username: username,
                        email: email,
                        website: website,
                    },
                });
                prisma_1.default.$disconnect();
                return !!updateUser;
            }
            catch (err) {
                console.log(err);
                return false;
            }
        });
    }
    ;
}
exports.default = ProfileService;
