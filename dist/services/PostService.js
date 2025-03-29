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
    // Create Post
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
                // media.map(async (file) => {
                //       const signedUrl = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/stream/${file.id}`, {
                //             method: "POST",
                //             headers: {
                //                   "Authorization": `Bearer ${process.env.CLOUDFLARE_ACCOUNT_TOKEN}`
                //             },
                //             body: JSON.stringify({ uid: file.id, requireSignedURLs: true })  // Streaming formData
                //       });
                //       if (signedUrl.ok) {
                //             const token = await signedUrl.json();
                //             console.log("SIGNED", token);
                //       }
                // })
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
    // Get Current User Posts
    static GetMyPosts(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 5;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const postCount = yield prisma_1.default.post.count({
                    where: {
                        user_id: userId,
                    },
                });
                const posts = yield prisma_1.default.post.findMany({
                    where: {
                        user_id: userId
                    },
                    select: {
                        id: true,
                        content: true,
                        post_id: true,
                        post_audience: true,
                        media: true,
                        created_at: true,
                        post_status: true,
                        post_impressions: true,
                        post_likes: true,
                        post_comments: true,
                        post_reposts: true,
                        was_repost: true,
                        repost_id: true,
                        repost_username: true,
                        UserMedia: {
                            select: {
                                id: true,
                                media_id: true,
                                post_id: true,
                                duration: true,
                                media_state: true,
                                poster: true,
                                url: true,
                                blur: true,
                                media_type: true,
                                locked: true,
                                accessible_to: true,
                                created_at: true,
                                updated_at: true,
                            },
                        },
                        PostLike: {
                            select: {
                                post_id: true,
                                user_id: true,
                            },
                        },
                        user: {
                            select: {
                                username: true,
                                profile_image: true,
                                name: true,
                                is_model: true,
                                user_id: true,
                                id: true,
                            },
                        },
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: {
                        created_at: "desc",
                    },
                });
                return {
                    status: true,
                    message: "Posts retrieved successfully",
                    data: posts,
                    total: postCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error);
            }
        });
    }
    // Get Current User Reposts
    static MyReposts(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 5;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const userRepostCount = yield prisma_1.default.userRepost.count({
                    where: {
                        user_id: userId,
                    },
                });
                if (userRepostCount === 0) {
                    return {
                        status: false,
                        total: 0,
                        data: [],
                        message: "No reposts found",
                    };
                }
                const userReposts = yield prisma_1.default.userRepost.findMany({
                    where: {
                        user_id: userId,
                    },
                    select: {
                        post: {
                            select: {
                                id: true,
                                content: true,
                                post_id: true,
                                post_audience: true,
                                post_status: true,
                                post_impressions: true,
                                media: true,
                                created_at: true,
                                post_likes: true,
                                post_comments: true,
                                post_reposts: true,
                                was_repost: true,
                                repost_id: true,
                                repost_username: true,
                                UserMedia: {
                                    select: {
                                        id: true,
                                        media_id: true,
                                        post_id: true,
                                        poster: true,
                                        duration: true,
                                        media_state: true,
                                        url: true,
                                        blur: true,
                                        media_type: true,
                                        locked: true,
                                        accessible_to: true,
                                        created_at: true,
                                        updated_at: true,
                                    },
                                },
                                PostLike: {
                                    select: {
                                        post_id: true,
                                        user_id: true,
                                    },
                                },
                                user: {
                                    select: {
                                        username: true,
                                        profile_image: true,
                                        name: true,
                                        user_id: true,
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: {
                        id: "desc",
                    },
                });
                const reposts = userReposts.map((repost) => repost.post);
                return {
                    status: true,
                    message: "Reposts retrieved successfully",
                    data: reposts,
                    total: userRepostCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Get Reposts
    static Reposts(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 5;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const userRepostCount = yield prisma_1.default.userRepost.count({
                    where: {
                        user_id: Number(userId),
                    },
                });
                if (userRepostCount === 0) {
                    return {
                        status: true,
                        message: "Reposts retrieved successfully",
                        data: [],
                        total: 0,
                    };
                }
                const userReposts = yield prisma_1.default.userRepost.findMany({
                    where: {
                        user_id: Number(userId),
                    },
                    select: {
                        post: {
                            select: {
                                id: true,
                                content: true,
                                post_id: true,
                                post_audience: true,
                                media: true,
                                post_status: true,
                                post_impressions: true,
                                created_at: true,
                                post_likes: true,
                                post_comments: true,
                                post_reposts: true,
                                was_repost: true,
                                repost_id: true,
                                repost_username: true,
                                UserMedia: {
                                    select: {
                                        id: true,
                                        media_id: true,
                                        post_id: true,
                                        media_state: true,
                                        poster: true,
                                        duration: true,
                                        url: true,
                                        blur: true,
                                        media_type: true,
                                        locked: true,
                                        accessible_to: true,
                                        created_at: true,
                                        updated_at: true,
                                    },
                                },
                                PostLike: {
                                    select: {
                                        post_id: true,
                                        user_id: true,
                                    },
                                },
                                user: {
                                    select: {
                                        username: true,
                                        profile_image: true,
                                        name: true,
                                        user_id: true,
                                        id: true,
                                    },
                                },
                            },
                        },
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: {
                        id: "desc",
                    },
                });
                const reposts = userReposts.map((repost) => repost.post);
                return {
                    status: true,
                    message: "Reposts retrieved successfully",
                    data: reposts,
                    total: userRepostCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Get My Media
    static GetMedia(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 6;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const postCount = yield prisma_1.default.post.findMany({
                    where: {
                        user_id: userId,
                    },
                });
                const mediaCount = yield prisma_1.default.userMedia.count({
                    where: {
                        OR: [...postCount.map((post) => ({ post_id: post.id }))],
                    },
                });
                const media = yield prisma_1.default.userMedia.findMany({
                    where: {
                        OR: [...postCount.map((post) => ({ post_id: post.id }))],
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: {
                        created_at: "desc",
                    },
                });
                return {
                    status: true,
                    message: "Media retrieved successfully",
                    data: media,
                    total: mediaCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Get Other Media
    static GetOtherMedia(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 6;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const postCount = yield prisma_1.default.post.findMany({
                    where: {
                        user_id: Number(userId),
                    },
                });
                const mediaCount = yield prisma_1.default.userMedia.count({
                    where: {
                        AND: [
                            {
                                accessible_to: "public",
                            },
                            {
                                accessible_to: "subscribers",
                            },
                        ],
                        media_state: "completed",
                        OR: [...postCount.map((post) => ({ post_id: post.id }))],
                    },
                });
                const media = yield prisma_1.default.userMedia.findMany({
                    where: {
                        NOT: {
                            accessible_to: "private",
                        },
                        media_state: "completed",
                        OR: [...postCount.map((post) => ({ post_id: post.id }))],
                    },
                    select: {
                        id: true,
                        media_id: true,
                        post_id: true,
                        poster: true,
                        duration: true,
                        media_state: true,
                        url: true,
                        blur: true,
                        media_type: true,
                        locked: true,
                        accessible_to: true,
                        post: {
                            select: {
                                id: true,
                                user: {
                                    select: {
                                        id: true
                                    }
                                }
                            }
                        }
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: {
                        created_at: "desc",
                    },
                });
                return {
                    status: true,
                    message: "Media retrieved successfully",
                    data: media,
                    total: mediaCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Get User Post By User ID
    static GetUserPostByID(_a) {
        return __awaiter(this, arguments, void 0, function* ({ userId, page, limit }) {
            try {
                // Parse limit to an integer or default to 5 if not provided
                const parsedLimit = limit ? parseInt(limit, 10) : 5;
                const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
                // Parse page to an integer or default to 1 if not provided
                const parsedPage = page ? parseInt(page, 10) : 1;
                const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
                const postCount = yield prisma_1.default.post.count({
                    where: {
                        user_id: Number(userId),
                        post_status: "approved",
                        NOT: {
                            post_audience: "private",
                        },
                    },
                });
                const posts = yield prisma_1.default.post.findMany({
                    where: {
                        user_id: Number(userId),
                        post_status: "approved",
                        NOT: {
                            post_audience: "private",
                        },
                    },
                    select: {
                        id: true,
                        content: true,
                        post_id: true,
                        post_audience: true,
                        media: true,
                        created_at: true,
                        post_likes: true,
                        post_status: true,
                        post_impressions: true,
                        post_comments: true,
                        post_reposts: true,
                        was_repost: true,
                        repost_id: true,
                        repost_username: true,
                        UserMedia: {
                            select: {
                                id: true,
                                media_id: true,
                                post_id: true,
                                duration: true,
                                poster: true,
                                url: true,
                                blur: true,
                                media_state: true,
                                media_type: true,
                                locked: true,
                                accessible_to: true,
                                created_at: true,
                                updated_at: true,
                            },
                        },
                        PostLike: {
                            select: {
                                post_id: true,
                                user_id: true,
                            },
                        },
                        user: {
                            select: {
                                username: true,
                                profile_image: true,
                                name: true,
                                user_id: true,
                                is_model: true,
                                id: true,
                            },
                        },
                    },
                    orderBy: {
                        created_at: "desc",
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                });
                return {
                    status: true,
                    message: "Posts retrieved successfully",
                    data: posts,
                    total: postCount,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Get Single Post By ID:
    static GetSinglePost(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId }) {
            try {
                const post = yield prisma_1.default.post.findFirst({
                    where: {
                        post_id: postId,
                        post_status: "approved",
                        NOT: [{
                                post_audience: "private",
                            }],
                    },
                    select: {
                        user: {
                            select: {
                                id: true,
                                username: true,
                                profile_image: true,
                                created_at: true,
                                name: true,
                                is_model: true,
                                user_id: true,
                            },
                        },
                        id: true,
                        content: true,
                        post_id: true,
                        post_audience: true,
                        post_status: true,
                        post_impressions: true,
                        created_at: true,
                        post_likes: true,
                        media: true,
                        post_comments: true,
                        post_reposts: true,
                        PostLike: true,
                        UserMedia: true,
                        was_repost: true,
                        repost_id: true,
                        user_id: true,
                        repost_username: true,
                    },
                });
                if (!post) {
                    return {
                        error: true,
                        status: false,
                        message: "Post not found",
                        data: null,
                    };
                }
                if (post.post_audience === "private") {
                    return {
                        error: true,
                        status: false,
                        data: null,
                        message: "Post not Private",
                    };
                }
                return {
                    error: false,
                    status: true,
                    message: "Post retrieved successfully",
                    data: post,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Edit Post
    static EditPost(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId }) {
            try {
                const post = yield prisma_1.default.post.findFirst({
                    where: {
                        post_id: postId,
                        post_status: "approved",
                    },
                    select: {
                        id: true,
                        content: true,
                        post_id: true,
                        post_audience: true,
                        created_at: true,
                        post_status: true,
                        post_impressions: true,
                        post_likes: true,
                        post_comments: true,
                        post_reposts: true,
                        PostLike: true,
                        UserMedia: true,
                    },
                });
                if (!post) {
                    return {
                        status: false,
                        data: null,
                        message: "Post not found",
                    };
                }
                return {
                    status: true,
                    message: "Post retrieved successfully",
                    data: post,
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
    // Update PostAudience
    static UpdatePostAudience(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId, userId, visibility }) {
            try {
                const findPost = yield prisma_1.default.post.findFirst({
                    where: {
                        post_id: postId,
                        user_id: userId
                    }
                });
                if (!findPost) {
                    return { error: true, message: "Post not found" };
                }
                const [updatePost, updateMedia] = yield prisma_1.default.$transaction([
                    prisma_1.default.post.update({
                        where: {
                            id: findPost.id
                        },
                        data: {
                            post_audience: String(visibility).trim().toLowerCase(),
                        }
                    }),
                    prisma_1.default.userMedia.updateMany({
                        where: {
                            post_id: findPost.id
                        },
                        data: {
                            accessible_to: String(visibility).trim().toLowerCase()
                        }
                    })
                ]);
                if (!updatePost || !updateMedia) {
                    return { error: true, message: "Could not update post audience" };
                }
                return { error: false, message: "Post audience updated" };
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
    // Create Repost
    static CreateRepost(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId, userId }) {
            try {
                const audienceTypes = ['private', 'subscribers', 'followers'];
                // Repost the post
                const getPost = yield prisma_1.default.post.findFirst({
                    where: {
                        post_id: postId,
                        post_status: "approved"
                    },
                    select: {
                        post_audience: true,
                        user: {
                            select: {
                                id: true
                            }
                        },
                        id: true,
                    }
                });
                if (!getPost) {
                    return {
                        error: true,
                        message: "Post not found"
                    };
                }
                const postAudience = getPost.post_audience;
                if (audienceTypes.includes(postAudience)) {
                    const isSubscriber = yield prisma_1.default.post.findFirst({
                        where: {
                            post_id: postId,
                            user: {
                                Subscribers: {
                                    some: {
                                        subscriber_id: userId,
                                    }
                                }
                            }
                        },
                    });
                    if (!isSubscriber && getPost.user.id !== userId) {
                        return {
                            error: true,
                            message: "You are not a subscriber of this post, therefore you cannot repost it"
                        };
                    }
                }
                const repostId = (0, uuid_1.v4)();
                const repost = yield prisma_1.default.$transaction((transaction) => __awaiter(this, void 0, void 0, function* () {
                    const repost = yield transaction.userRepost.create({
                        data: {
                            post_id: getPost.id,
                            user_id: userId,
                            repost_id: repostId
                        }
                    });
                    yield transaction.post.update({
                        where: {
                            id: getPost.id,
                        },
                        data: {
                            post_reposts: {
                                increment: 1
                            },
                        }
                    });
                    return repost;
                }));
                if (repost) {
                    prisma_1.default.$disconnect();
                    return {
                        error: false,
                        message: "Post reposted successfully"
                    };
                }
                return {
                    error: true,
                    message: "An error occurred while reposting the post"
                };
            }
            catch (error) {
                throw new Error(error.message);
            }
        });
    }
    // Get Post Comments
    static GetPostComments(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId, page = "1", limit = "10" }) {
            const countComments = yield prisma_1.default.postComment.count({
                where: {
                    post_id: Number(postId)
                }
            });
            const comments = yield prisma_1.default.postComment.findMany({
                where: {
                    post_id: Number(postId),
                },
                orderBy: {
                    created_at: "desc",
                },
                select: {
                    id: true,
                    comment: true,
                    created_at: true,
                    user: {
                        select: {
                            id: true,
                            user_id: true,
                            name: true,
                            username: true,
                            profile_image: true,
                        },
                    },
                    PostCommentAttachments: {
                        select: {
                            id: true,
                            comment_id: true,
                            path: true,
                            type: true,
                            created_at: true,
                        },
                    },
                    PostCommentLikes: {
                        select: {
                            id: true,
                            comment_id: true,
                            user_id: true,
                            created_at: true,
                        },
                    },
                },
                skip: (parseInt(page) - 1) * parseInt(limit),
                take: parseInt(limit) + 1,
            });
            const hasMore = comments.length > parseInt(limit);
            if (hasMore) {
                comments.pop();
            }
            if (!comments || comments.length == 0) {
                return {
                    error: false,
                    message: "No comments found",
                    hasMore: false,
                    data: [],
                    total: 0
                };
            }
            return {
                error: false,
                message: "Comments found",
                data: comments,
                hasMore: hasMore,
                total: countComments
            };
        });
    }
    // Like A Post
    static LikePost(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId, userId }) {
            try {
                let postHasBeenLiked = false;
                // Verify if post has been liked by user
                const postLike = yield prisma_1.default.postLike.findFirst({
                    where: {
                        post_id: parseInt(postId),
                        user_id: userId
                    }
                });
                if (!postLike) {
                    yield prisma_1.default.postLike.create({
                        data: {
                            post_id: parseInt(postId),
                            like_id: 1,
                            user_id: userId
                        }
                    });
                    yield prisma_1.default.post.update({
                        where: {
                            id: Number(postId)
                        },
                        data: {
                            post_likes: {
                                increment: 1
                            }
                        }
                    });
                    postHasBeenLiked = true;
                }
                else {
                    yield prisma_1.default.postLike.delete({
                        where: {
                            id: postLike.id
                        }
                    });
                    yield prisma_1.default.post.update({
                        where: {
                            id: parseInt(postId)
                        },
                        data: {
                            post_likes: {
                                decrement: 1
                            }
                        }
                    });
                }
                return {
                    success: true,
                    isLiked: postHasBeenLiked,
                    message: postHasBeenLiked ? "Post has been liked" : "Post has been unliked"
                };
            }
            catch (error) {
                console.error(error);
                throw new Error(error.message);
            }
        });
    }
    // Delete Post
    static DeletePost(_a) {
        return __awaiter(this, arguments, void 0, function* ({ postId, userId }) {
            try {
                const post = yield prisma_1.default.post.findFirst({
                    where: {
                        post_id: postId,
                        user_id: userId,
                    },
                });
                if (!post) {
                    return {
                        status: false,
                        message: "Post not found",
                    };
                }
                const postMedia = yield prisma_1.default.userMedia.findMany({
                    where: {
                        post_id: post.id,
                    }
                });
                if (postMedia.length > 0) {
                    const media = postMedia.map((media) => ({
                        id: media.media_id,
                        type: media.media_type
                    }));
                    console.log("Media", media);
                    if (media && media.length > 0) {
                        const removeMedia = yield (0, RemoveCloudflareMedia_1.default)(media);
                        if ('error' in removeMedia && removeMedia.error) {
                            return {
                                status: false,
                                message: "An error occurred while deleting media",
                                error: removeMedia.error,
                            };
                        }
                    }
                }
                yield prisma_1.default.post.delete({
                    where: {
                        id: post.id,
                    },
                });
                return {
                    status: true,
                    message: "Post deleted successfully",
                };
            }
            catch (error) {
                console.log(error);
                throw new Error(error.message);
            }
        });
    }
}
exports.default = PostService;
