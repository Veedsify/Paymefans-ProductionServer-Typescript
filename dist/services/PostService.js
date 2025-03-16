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
const uuid_1 = require("uuid");
const prisma_1 = __importDefault(require("@utils/prisma"));
const RemoveCloudflareMedia_1 = __importDefault(require("@libs/RemoveCloudflareMedia"));
class PostService {
    static CreatePost(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const postId = (0, uuid_1.v4)();
                const user = data.user;
                const { content, visibility, media, removedMedia } = data;
                if (removedMedia) {
                    const removeMedia = yield (0, RemoveCloudflareMedia_1.default)(removedMedia);
                    if ('error' in removeMedia && removeMedia.error) {
                        return {
                            status: false,
                            message: "An error occurred while deleting media",
                            error: removeMedia.error,
                        };
                    }
                }
                if ((!content || content.trim().length === 0) && !visibility) {
                    return {
                        status: false,
                        error: true,
                        message: "Content and visibility are required",
                    };
                }
                // Continue with the rest of your logic
                const post = yield prisma_1.default.post.create({
                    data: {
                        post_id: postId,
                        was_repost: false,
                        content: content ? content : "",
                        post_audience: visibility,
                        post_status: "pending",
                        post_is_visible: true,
                        user_id: user.id,
                        media: [],
                        UserMedia: {
                            createMany: {
                                data: media.map((file) => {
                                    if (file && file.id) {
                                        return {
                                            media_id: file.id,
                                            media_type: file.type,
                                            url: file.public,
                                            media_state: file.type.includes("image") ? "completed" : "processing",
                                            blur: file.blur,
                                            poster: file.public,
                                            accessible_to: visibility,
                                            locked: visibility === "subscribers",
                                        };
                                    }
                                    else {
                                        console.error("Invalid file response:", file);
                                        return null;
                                    }
                                }).filter(Boolean),
                            },
                        },
                    },
                });
                // Save post to database
                return {
                    status: true,
                    message: "Post created successfully",
                    data: post,
                };
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
}
exports.default = PostService;
