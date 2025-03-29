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
const GetVideoDuration_1 = require("@libs/GetVideoDuration");
const UploadImageToS3_1 = require("@libs/UploadImageToS3");
const UploadVideoToS3_1 = __importDefault(require("@libs/UploadVideoToS3"));
const GenerateUniqueId_1 = require("@utils/GenerateUniqueId");
const prisma_1 = __importDefault(require("@utils/prisma"));
class StoryService {
    // Get Stories from the database
    static GetStories(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, }) {
            try {
                // Step 1: Get user's followers
                const user = yield prisma_1.default.user.findUnique({
                    where: { id: userId },
                    include: { Follow: true, Subscribers: true },
                });
                if (!user) {
                    return {
                        status: false,
                        data: null,
                        message: "User not found",
                    };
                }
                const subscribers = user.Subscribers; // subscribers of the user
                const following = user.Follow; // Users the user is following
                let userIdsToFetch = [];
                // Step 2: Check following count
                if (following.length > 30) {
                    userIdsToFetch = following.slice(0, 30).map((u) => u.follower_id);
                }
                else {
                    userIdsToFetch = [
                        ...following.map((u) => u.follower_id),
                        ...subscribers.map((u) => u.subscriber_id),
                    ];
                    // Remove duplicates and ensure we have up to 15 users
                    userIdsToFetch = Array.from(new Set(userIdsToFetch)).slice(0, 30);
                }
                userIdsToFetch.unshift(userId);
                // Step 3: Fallback for no following
                if (userIdsToFetch.length >= 1) {
                    const randomStories = yield prisma_1.default.userStory.findMany({
                        where: {
                            created_at: {
                                gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
                            },
                        },
                        take: 15,
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    username: true,
                                    profile_image: true,
                                    bio: true,
                                    fullname: true,
                                    name: true,
                                    LiveStream: true,
                                    Follow: true,
                                    Subscribers: true,
                                    role: true,
                                },
                            },
                            StoryMedia: true,
                        },
                        orderBy: { created_at: "asc" },
                    });
                    // Group randomStories by user
                    const groupedRandomStories = Object.values(randomStories.reduce((acc, story) => {
                        const userId = story.user.id;
                        if (!acc[userId]) {
                            acc[userId] = { user: story.user, stories: [], storyCount: 0 };
                        }
                        acc[userId].stories.push(story);
                        acc[userId].storyCount += 1;
                        return acc;
                    }, {}));
                    return {
                        status: true,
                        message: "User stories fetched successfully",
                        data: groupedRandomStories,
                    };
                }
                // Step 4: Get stories from the selected users
                const stories = yield prisma_1.default.userStory.findMany({
                    where: {
                        user_id: { in: userIdsToFetch },
                        created_at: {
                            gte: new Date(new Date().setHours(0, 0, 0, 0) - 24 * 60 * 60 * 1000),
                        },
                    },
                    include: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                profile_image: true,
                                bio: true,
                                fullname: true,
                                name: true,
                                LiveStream: true,
                                Follow: true,
                                Subscribers: true,
                                role: true,
                            },
                        },
                        StoryMedia: true,
                    },
                    orderBy: { created_at: "asc" },
                });
                // Step 5: Group stories by user
                const groupedStories = Object.values(stories.reduce((acc, story) => {
                    const userId = story.user.id;
                    if (!acc[userId]) {
                        acc[userId] = { user: story.user, stories: [], storyCount: 0 };
                    }
                    acc[userId].stories.push(story);
                    acc[userId].storyCount += 1;
                    return acc;
                }, {}));
                return {
                    status: true,
                    message: "User stories fetched successfully",
                    data: groupedStories,
                };
            }
            catch (error) {
                console.error(error);
                throw new Error("An error occurred while fetching user stories");
            }
        });
    }
    // Get My Media
    static GetMyMedia(_a) {
        return __awaiter(this, arguments, void 0, function* ({ page, limit, user, }) {
            try {
                // Parse limit and page parameters
                const parsedLimit = limit ? parseInt(String(limit), 10) : 6;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                const parsedPage = page ? parseInt(String(page), 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                let hasMore = false;
                return yield prisma_1.default.$transaction((prisma) => __awaiter(this, void 0, void 0, function* () {
                    const postCount = yield prisma.post.findMany({
                        where: { user_id: user.id },
                    });
                    const postIds = postCount.map((post) => post.id);
                    const mediaCount = yield prisma.userMedia.count({
                        where: {
                            post_id: { in: postIds },
                        },
                    });
                    const media = yield prisma.userMedia.findMany({
                        where: {
                            post_id: { in: postIds },
                        },
                        skip: (validPage - 1) * validLimit,
                        take: validLimit + 1,
                        orderBy: {
                            created_at: "desc",
                        },
                    });
                    if (media.length > validLimit) {
                        hasMore = true;
                        media.pop();
                    }
                    return {
                        status: true,
                        error: false,
                        message: "Media retrieved successfully",
                        data: media,
                        hasMore: hasMore,
                        total: mediaCount,
                    };
                }));
            }
            catch (error) {
                console.log(error);
                throw new Error(error);
            }
        });
    }
    // Save Story
    static SaveStory(_a) {
        return __awaiter(this, arguments, void 0, function* ({ stories, user, }) {
            try {
                const lengthArray = yield Promise.all(stories.map((story) => __awaiter(this, void 0, void 0, function* () {
                    if (story.media_type === "video") {
                        return yield (0, GetVideoDuration_1.getDuration)(story.media_url);
                    }
                    else {
                        return 5000;
                    }
                })));
                // Save stories
                const story_id = `STR${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
                const story = yield prisma_1.default.userStory.create({
                    data: {
                        user_id: user.id,
                        story_id,
                        StoryMedia: {
                            create: stories.map((story, index) => {
                                return {
                                    media_id: `MED${(0, GenerateUniqueId_1.GenerateUniqueId)()}`,
                                    media_type: story.media_type,
                                    filename: story.media_url,
                                    url: story.media_url,
                                    duration: story.media_type === "image"
                                        ? Number(5000)
                                        : Number(lengthArray[index]),
                                    story_content: story.caption,
                                    captionStyle: story.captionStyle,
                                };
                            }),
                        },
                    },
                    include: {
                        StoryMedia: true,
                    },
                });
                return {
                    error: false,
                    data: story,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occurred while saving stories");
            }
        });
    }
    // Upload Story
    static UploadStory(_a) {
        return __awaiter(this, arguments, void 0, function* ({ files, }) {
            try {
                const fileUploads = files.map((file) => __awaiter(this, void 0, void 0, function* () {
                    const s3Key = `stories/videos/${file.filename}`;
                    if (file.mimetype.includes("video")) {
                        yield (0, UploadVideoToS3_1.default)(file, s3Key, "test");
                        return {
                            filename: `${process.env.AWS_CLOUDFRONT_URL}/${s3Key}`,
                            mimetype: file.mimetype,
                        };
                    }
                    return yield new Promise((resolve, _) => __awaiter(this, void 0, void 0, function* () {
                        return yield (0, UploadImageToS3_1.UploadImageToS3)({
                            file,
                            contentType: file.mimetype,
                            folder: "stories",
                            format: "webp",
                            quality: 100,
                            resize: {
                                width: 1200,
                                fit: "cover",
                                position: "center",
                                height: null,
                            },
                            saveToDb: true,
                            onUploadComplete: (url) => __awaiter(this, void 0, void 0, function* () {
                                resolve({
                                    filename: url,
                                    mimetype: file.mimetype,
                                });
                            }),
                        });
                    }));
                }));
                const results = yield Promise.all(fileUploads);
                const uploadedFiles = results.map((file) => {
                    return {
                        filename: file.filename,
                        mimetype: file.mimetype,
                    };
                });
                return {
                    error: false,
                    data: uploadedFiles,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error("An error occurred while uploading stories");
            }
        });
    }
}
exports.default = StoryService;
