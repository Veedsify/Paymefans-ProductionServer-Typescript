import type {
    CreatePostProps,
    CreatePostResponse,
    CreateRepostProps,
    DeletePostResponse,
    EditPostProps,
    EditPostResponse,
    GetMyMediaProps,
    GetMyMediaResponse,
    GetMyPostProps,
    GetMyPostResponse,
    GetOtherMediaProps,
    GetOtherMediaResponse,
    GetPostCommentsProps,
    GetPostCommentsResponse,
    GetSinglePostResponse,
    GetUserPostByIdProps,
    GetUserPostByIdResponse,
    GiftPointsProps,
    LikePostProps,
    LikePostResponse,
    PayForPostProps,
    PayForPostResponse,
    RepostProps,
    RepostResponse,
} from "../types/post";
import { v4 as uuid } from "uuid";
import query from "@utils/prisma";
import { MediaState, PostAudience } from "@prisma/client";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";
import { Comments } from "@utils/mongoSchema";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { UserTransactionQueue } from "@jobs/notifications/UserTransactionJob";
import EmailService from "./EmailService";
import GetSinglename from "@utils/GetSingleName";

export default class PostService {
    // Create Post
    static async CreatePost(data: CreatePostProps): Promise<CreatePostResponse> {
        try {
            const postId = uuid();
            const user = await query.user.findUnique({
                where: { id: data.user.id },
            })

            if (!user) {
                throw new Error("User not found");
            }
            const { content, visibility, media, removedMedia, price } = data;

            if (removedMedia) {
                const removeMedia = await RemoveCloudflareMedia(removedMedia);
                if (removeMedia?.error) {
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

            if (visibility === "price" && !price) {
                return {
                    status: false,
                    error: true,
                    message: "Price is required for price posts",
                };
            }

            if (visibility === "price" && price && price < 0) {
                return {
                    status: false,
                    error: true,
                    message: "Price for post cannot be 0",
                };
            }

            // Optimize media processing with early validation
            const userMediaData = [];
            let allImages = true;

            if (media?.length > 0) {
                for (const file of media) {
                    if (!file?.id) continue; // Skip invalid files

                    if (file.type !== "image") {
                        allImages = false;
                    }

                    userMediaData.push({
                        media_id: file.id,
                        user_id: user.id,
                        media_type: file.type,
                        url: file.public,
                        media_state: (file.type === "image" ? "completed" : "processing") as MediaState,
                        blur: String(file.blur),
                        poster: file.public,
                        accessible_to: visibility,
                        locked: visibility === "subscribers",
                    });
                }
            }
            // Move the media count check earlier to fail fast
            if (media?.length > 0 && !user.is_model) {
                const userMediaCount = await query.userMedia.count({
                    where: { user_id: user.id },
                });

                const userMediaDataCount = userMediaData.length || 0;

                if (Number(userMediaCount + userMediaDataCount) >= 6) {
                    // Remove the Media From Cloudflare 
                    await RemoveCloudflareMedia(media.map(file => ({ id: file.id, type: file.type })));
                    throw new Error("Sorry You have reached the maximum media limit of 6, as a fan user. Upgrade to a model/creator account to unlock unlimited uploads and access all features as a content creator.");
                }
            }

            const post = await query.post.create({
                data: {
                    post_id: postId,
                    was_repost: false,
                    content: content || "",
                    post_audience: visibility as PostAudience,
                    post_status: allImages ? "approved" : "pending",
                    post_is_visible: true,
                    user_id: user.id,
                    post_price: visibility === "price" ? price : null,
                    media: [],
                    UserMedia: {
                        createMany: { data: userMediaData },
                    },
                },
            });

            return {
                status: true,
                message: "Post created successfully",
                data: post,
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    // Get Current User Posts
    static async GetMyPosts({
        userId,
        page,
        limit,
    }: GetMyPostProps): Promise<GetMyPostResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            const posts = await query.post.findMany({
                where: { user_id: userId },
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
                            user_id: true,
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
                take: validLimit + 1,
                orderBy: { created_at: "desc" },
            });

            let hasMore = false;
            if (posts.length > validLimit) {
                hasMore = true;
                posts.pop();
            }
            // batch fetch likes and reposts to reduce N+1 queries
            const postIds = posts.map(post => post.id);
            const [likes, reposts] = await Promise.all([
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(reposts.map(r => r.post_id));

            const resolvedPosts = posts.map(post => ({
                ...post,
                isSubscribed: true,
                wasReposted: postRepostSet.has(post.id),
                likedByme: postLikesSet.has(post.id),
            }));

            return {
                status: true,
                message: "Posts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error);
        }
    }

    // Get Current Private User Posts
    static async GetMyPrivatePosts({
        userId,
        page,
        limit,
    }: GetMyPostProps): Promise<GetMyPostResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            const posts = await query.post.findMany({
                where: {
                    user_id: userId,
                    OR: [{ post_audience: "price" }, { post_audience: "subscribers" }, { post_audience: "private" }],
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
                            user_id: true,
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
                take: validLimit + 1,
                orderBy: { created_at: "desc" },
            });

            let hasMore = false;
            if (posts.length > validLimit) {
                hasMore = true;
                posts.pop();
            }

            const postIds = posts.map(post => post.id);

            // Batch likes and reposts
            const [likes, reposts] = await Promise.all([
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(reposts.map(r => r.post_id));

            const resolvedPosts = posts.map(post => ({
                ...post,
                likedByme: postLikesSet.has(post.id),
                wasReposted: postRepostSet.has(post.id),
                isSubscribed: true,
            }));

            return {
                status: true,
                message: "Posts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error);
        }
    }

    // Get Current User Reposts
    static async MyReposts({
        userId,
        page = "1",
        limit = "20",
    }: GetMyPostProps): Promise<GetMyPostResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const userRepostCount = await query.userRepost.count({ where: { user_id: userId } });
            if (userRepostCount === 0) {
                return { status: false, hasMore: false, data: [], message: "No reposts found" };
            }
            const userReposts = await query.userRepost.findMany({
                where: { user_id: userId },
                select: {
                    post: {
                        select: {
                            id: true,
                            content: true,
                            post_id: true,
                            post_audience: true,
                            post_status: true,
                            post_price: true,
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
                                    user_id: true,
                                    blur: true,
                                    media_type: true,
                                    locked: true,
                                    accessible_to: true,
                                    created_at: true,
                                    updated_at: true,
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
                skip: (Number(page) - 1) * validLimit,
                take: validLimit + 1,
                orderBy: { id: "desc" },
            });

            let hasMore = false;
            if (userReposts.length > validLimit) hasMore = true;

            const reposts = userReposts.map(repost => repost.post);
            const postIds = reposts.map(post => post.id);
            // Batch likes and reposts
            const [likes, repostsDb] = await Promise.all([
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(repostsDb.map(r => r.post_id));

            const resolvedPosts = reposts.map(post => ({
                ...post,
                likedByme: postLikesSet.has(post.id),
                wasReposted: postRepostSet.has(post.id),
                isSubscribed: true,
            }));

            return {
                status: true,
                message: "Reposts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get Reposts
    static async Reposts({
        userId,
        page,
        limit,
        authUserId,
    }: RepostProps): Promise<GetMyPostResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            const userReposts = await query.userRepost.findMany({
                where: { user_id: Number(userId) },
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
                            post_price: true,
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
                                    user_id: true,
                                    blur: true,
                                    media_type: true,
                                    locked: true,
                                    accessible_to: true,
                                    created_at: true,
                                    updated_at: true,
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
                take: validLimit + 1,
                orderBy: { id: "desc" },
            });

            let hasMore = false;
            if (userReposts.length > validLimit) {
                hasMore = true;
                userReposts.pop();
            }
            const reposts = userReposts.map(repost => repost.post);
            const postIds = reposts.map(post => post.id);
            // Batch likes and reposts
            const [likes, repostsDb] = await Promise.all([
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: userId } }),
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: authUserId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(repostsDb.map(r => r.post_id));

            const resolvedPosts = reposts.map(post => ({
                ...post,
                likedByme: postLikesSet.has(post.id),
                wasReposted: postRepostSet.has(post.id),
                isSubscribed: true,
            }));

            return {
                status: true,
                message: "Reposts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get My Media
    static async GetMedia({
        userId,
        page,
        limit,
    }: GetMyMediaProps): Promise<GetMyMediaResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 6;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            // get post ids by user, then fetch all that media in one go
            const postIds = (await query.post.findMany({
                where: { user_id: userId },
                select: { id: true },
            })).map(p => p.id);

            const [mediaCount, media] = await Promise.all([
                query.userMedia.count({ where: { post_id: { in: postIds } } }),
                query.userMedia.findMany({
                    where: { post_id: { in: postIds } },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit,
                    orderBy: { created_at: "desc" },
                }),
            ]);
            // isSubscribed: true can be done without map over async
            const mediaChecked = media.map(mediaFile => ({ ...mediaFile, isSubscribed: true }));
            return {
                status: true,
                message: "Media retrieved successfully",
                data: mediaChecked,
                total: mediaCount,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get Other Media
    static async GetOtherMedia({
        userId,
        page,
        limit,
        authUserId,
    }: GetOtherMediaProps): Promise<GetOtherMediaResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 6;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            const postIds = (await query.post.findMany({
                where: { user_id: Number(userId) },
                select: { id: true },
            })).map(p => p.id);

            const [isSubscribed, media] = await Promise.all([
                query.subscribers.findFirst({
                    where: { subscriber_id: Number(authUserId), status: "active", user_id: Number(userId) },
                }),
                query.userMedia.findMany({
                    where: {
                        NOT: { accessible_to: "private" },
                        media_state: "completed",
                        post_id: { in: postIds },
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
                                user: { select: { id: true } },
                            },
                        },
                    },
                    skip: (validPage - 1) * validLimit,
                    take: validLimit + 1,
                    orderBy: { created_at: "desc" },
                }),
            ]);

            let hasMore = false;
            if (media.length > validLimit) {
                hasMore = true;
                media.pop();
            }
            const resolvedMedia = media.map(mediaFile => ({
                ...mediaFile,
                isSubscribed: mediaFile.post.user.id === Number(authUserId) || !!isSubscribed,
            }));

            return {
                status: true,
                message: "Media retrieved successfully",
                data: resolvedMedia,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get User Post By User ID
    static async GetUserPostByID({
        userId,
        page,
        limit,
        authUserId
    }: GetUserPostByIdProps): Promise<GetUserPostByIdResponse> {
        try {
            if (!userId || isNaN(Number(userId))) {
                return {
                    error: true,
                    status: false,
                    message: "Valid User ID is required",
                    data: [],
                    hasMore: false,
                };
            }
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
            const parsedUserId = Number(userId);

            const posts = await query.post.findMany({
                where: {
                    user_id: parsedUserId,
                    post_status: "approved",
                    NOT: { post_audience: "private" },
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
                    post_price: true,
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
                            user_id: true,
                            media_type: true,
                            locked: true,
                            accessible_to: true,
                            created_at: true,
                            updated_at: true,
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
                orderBy: { created_at: "desc" },
                skip: (validPage - 1) * validLimit,
                take: validLimit + 1,
            });

            let hasMore = false;
            if (posts.length > validLimit) {
                posts.pop();
                hasMore = true;
            }

            const postIds = posts.map(post => post.id);
            // Batch queries
            const [subs, likes, reposts] = await Promise.all([
                query.subscribers.findFirst({
                    where: { subscriber_id: authUserId, status: "active", user_id: parsedUserId }
                }),
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: posts.length ? posts[0].user.id : 0 } }), // note: original used post.user.id, possible logic bug
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: authUserId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(reposts.map(r => r.post_id));

            const resolvedPosts = posts.map(post => ({
                ...post,
                likedByme: postLikesSet.has(post.id),
                wasReposted: postRepostSet.has(post.id),
                isSubscribed: !!subs,
            }));
            return {
                error: false,
                status: true,
                message: "Posts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get User Private Posts By ID
    static async GetUserPrivatePostByID({
        userId,
        page,
        limit,
        authUserId,
    }: GetUserPostByIdProps): Promise<GetUserPostByIdResponse> {
        try {
            const parsedLimit = limit ? parseInt(limit, 10) : 5;
            const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
            const parsedPage = page ? parseInt(page, 10) : 1;
            const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

            const posts = await query.post.findMany({
                where: {
                    user_id: Number(userId),
                    post_status: "approved",
                    OR: [{ post_audience: "price" }, { post_audience: "subscribers" }],
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
                    post_price: true,
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
                            user_id: true,
                            media_type: true,
                            locked: true,
                            accessible_to: true,
                            created_at: true,
                            updated_at: true,
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
                orderBy: { created_at: "desc" },
                skip: (validPage - 1) * validLimit,
                take: validLimit + 1,
            });

            let hasMore = false;
            if (posts.length > validLimit) {
                posts.pop();
                hasMore = true;
            }
            const postIds = posts.map(post => post.id);

            const [subs, likes, reposts] = await Promise.all([
                query.subscribers.findFirst({
                    where: { subscriber_id: authUserId, status: "active", user_id: Number(userId) }
                }),
                query.postLike.findMany({ where: { post_id: { in: postIds }, user_id: posts.length ? posts[0].user.id : 0 } }),
                query.userRepost.findMany({ where: { post_id: { in: postIds }, user_id: authUserId } }),
            ]);
            const postLikesSet = new Set(likes.map(l => l.post_id));
            const postRepostSet = new Set(reposts.map(r => r.post_id));

            const resolvedPosts = posts.map(post => ({
                ...post,
                likedByme: postLikesSet.has(post.id),
                wasReposted: postRepostSet.has(post.id),
                isSubscribed: !!subs || post.user.id === authUserId,
            }));

            return {
                error: false,
                status: true,
                message: "Posts retrieved successfully",
                data: resolvedPosts,
                hasMore,
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Get Single Post By ID
    static async GetSinglePost({
        postId,
        authUserId
    }: {
        postId: string;
        authUserId: number
    }): Promise<GetSinglePostResponse> {
        try {
            const post = await query.post.findFirst({
                where: {
                    post_id: postId,
                    post_status: "approved",
                    NOT: [{ post_audience: "private" }],
                    user: { active_status: true }
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
                    post_price: true,
                    created_at: true,
                    post_likes: true,
                    media: true,
                    post_comments: true,
                    post_reposts: true,
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
            // one query for like
            const [postLike, isSubscribed, isRespoted] = await Promise.all([
                query.postLike.findFirst({ where: { post_id: post.id, user_id: authUserId } }),
                query.subscribers.findFirst({ where: { user_id: post.user_id, status: "active", subscriber_id: authUserId } }),
                query.userRepost.findFirst({ where: { post_id: post.id, user_id: authUserId } }),
            ]);
            return {
                error: false,
                status: true,
                message: "Post retrieved successfully",
                data: {
                    ...post,
                    likedByme: !!postLike,
                    wasReposted: !!isRespoted,
                    isSubscribed: !!isSubscribed || post.user_id === authUserId,
                },
            };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Edit Post
    static async EditPost({ postId }: EditPostProps): Promise<EditPostResponse> {
        try {
            const post = await query.post.findFirst({
                where: { post_id: postId, post_status: "approved" },
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
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Update PostAudience
    static async UpdatePostAudience({ postId, userId, visibility }: { postId: string; userId: number; visibility: string; }): Promise<any> {
        try {
            const findPost = await query.post.findFirst({
                where: { post_id: postId, user_id: userId },
            });
            if (!findPost) {
                return { error: true, message: "Post not found" };
            }
            // transaction for atomic multi-table update
            const [updatePost, updateMedia] = await query.$transaction([
                query.post.update({
                    where: { id: findPost.id },
                    data: {
                        post_audience: String(visibility).trim().toLowerCase() as PostAudience,
                    },
                }),
                query.userMedia.updateMany({
                    where: { post_id: findPost.id },
                    data: {
                        accessible_to: String(visibility).trim().toLowerCase(),
                    },
                }),
            ]);
            if (!updatePost || !updateMedia) {
                return { error: true, message: "Could not update post audience" };
            }
            return { error: false, message: "Post audience updated" };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    static async CreateRepost({ postId, userId }: CreateRepostProps): Promise<RepostResponse> {
        try {
            const audienceTypes = ["private", "subscribers", "followers"];
            const getPost = await query.post.findFirst({
                where: { post_id: postId, post_status: "approved" },
                select: { post_audience: true, user: { select: { id: true } }, id: true },
            });
            if (!getPost) {
                return { error: true, message: "Post not found" };
            }
            // Audience check
            const postAudience = getPost.post_audience;
            if (audienceTypes.includes(postAudience)) {
                const isSubscriber = await query.post.findFirst({
                    where: {
                        post_id: postId,
                        user: { Subscribers: { some: { subscriber_id: userId } } },
                    },
                });
                if (!isSubscriber && getPost.user.id !== userId) {
                    return {
                        error: true,
                        message: "You are not a subscriber of this post, therefore you cannot repost it",
                    };
                }
            }
            // Already reposted?
            const existingRepost = await query.userRepost.findFirst({
                where: { post_id: getPost.id, user_id: userId },
            });
            if (existingRepost) {
                await query.$transaction([
                    query.userRepost.delete({ where: { id: existingRepost.id } }),
                    query.post.update({
                        where: { id: getPost.id },
                        data: { post_reposts: { decrement: 1 } },
                    }),
                ]);
                return { error: false, message: "You unreposted the post successfully" };
            } else {
                const repostId = uuid();
                await query.$transaction([
                    query.userRepost.create({
                        data: { post_id: getPost.id, user_id: userId, repost_id: repostId },
                    }),
                    query.post.update({
                        where: { id: getPost.id },
                        data: { post_reposts: { increment: 1 } },
                    }),
                ]);
                return { error: false, message: "Post reposted successfully" };
            }
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    // Get Post Comments
    static async GetPostComments({ postId, page = "1", limit = "10" }: GetPostCommentsProps): Promise<GetPostCommentsResponse> {
        const countComments = await Comments.countDocuments({ postId: String(postId) });
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const limitInt = parseInt(limit);
        const comments = await Comments.find({ postId: String(postId), parentId: null })
            .sort({ date: -1 })
            .skip(skip)
            .limit(limitInt + 1); // one extra for hasMore
        const hasMore = comments.length > limitInt;
        if (hasMore) comments.pop();
        if (!comments || comments.length == 0) {
            return {
                error: false,
                message: "No comments found",
                hasMore: false,
                data: [],
                total: 0,
            };
        }
        return {
            error: false,
            message: "Comments found",
            data: comments,
            hasMore,
            total: countComments,
        };
    }

    // Like A Post
    static async LikePost({ postId, userId }: LikePostProps): Promise<LikePostResponse> {
        try {
            // Use transaction for atomic like/unlike+count update
            const postLike = await query.postLike.findFirst({
                where: { post_id: parseInt(postId), user_id: userId },
            });
            let isLiked = false;
            await query.$transaction(async (prisma) => {
                if (!postLike) {
                    await prisma.postLike.create({
                        data: {
                            post_id: parseInt(postId),
                            like_id: 1,
                            user_id: userId,
                        },
                    });
                    await prisma.post.update({
                        where: { id: Number(postId) },
                        data: { post_likes: { increment: 1 } },
                    });
                    isLiked = true;
                } else {
                    await prisma.postLike.delete({ where: { id: postLike.id } });
                    await prisma.post.update({
                        where: { id: parseInt(postId) },
                        data: { post_likes: { decrement: 1 } },
                    });
                    isLiked = false;
                }
            });
            return {
                success: true,
                isLiked,
                message: isLiked ? "Post has been liked" : "Post has been unliked",
            };
        } catch (error: any) {
            console.error(error);
            throw new Error(error.message);
        }
    }

    // Delete Post
    static async DeletePost({ postId, userId }: { postId: string; userId: number; }): Promise<DeletePostResponse> {
        try {
            const post = await query.post.findFirst({
                where: { post_id: postId, user_id: userId },
            });
            if (!post) {
                return { status: false, message: "Post not found" };
            }
            const postMedia = await query.userMedia.findMany({
                where: { post_id: post.id },
                select: { media_id: true, media_type: true }
            });

            // Use transaction to delete post+media
            await query.$transaction(async (tx) => {
                await tx.userMedia.deleteMany({ where: { post_id: post.id } })
                await tx.postLike.deleteMany({ where: { post_id: post.id } })
                await tx.userRepost.deleteMany({ where: { post_id: post.id } })
                await tx.postGift.deleteMany({ where: { post_id: post.id } })
                await tx.post.delete({ where: { id: post.id } })
            });


            if (postMedia.length > 0) {
                const removeMedia = await RemoveCloudflareMedia(
                    postMedia.map(m => ({ id: m.media_id, type: m.media_type }))
                );
                if (removeMedia.error) {
                    return {
                        status: false,
                        message: "An error occurred while deleting media",
                        error: removeMedia,
                    };
                }
            }

            await Comments.deleteMany({ postId: String(post.post_id) });
            return { status: true, message: "Post deleted successfully" };
        } catch (error: any) {
            console.log(error);
            throw new Error(error.message);
        }
    }

    // Gift Points
    static async GiftPoints(options: GiftPointsProps): Promise<{ message: string; error: boolean }> {
        try {
            if (!options.points || !options.userId || !options.postId) {
                return {
                    message: "Points, userId and postId are required",
                    error: true,
                };
            }
            const { points, userId, postId, receiver_id } = options;
            const findPost = await query.post.findFirst({
                where: { post_id: postId, user_id: receiver_id },
            });
            if (!findPost) {
                return { message: "Post not found", error: true };
            }
            // Check enough points
            const user = await query.user.findFirst({
                where: { id: userId },
                include: { UserPoints: true, UserWallet: { select: { id: true } } },
            });
            if (user?.UserPoints && user?.UserPoints?.points < points) {
                return { message: "You do not have enough points", error: true };
            }
            // Atomic transfer
            await query.$transaction([
                query.user.update({
                    where: { id: userId },
                    data: { UserPoints: { update: { points: { decrement: points } } } },
                }),
                query.user.update({
                    where: { id: receiver_id },
                    data: { UserPoints: { update: { points: { increment: points } } } },
                }),
            ]);
            const receiver = await query.user.findFirst({ where: { id: receiver_id }, include: { UserWallet: true } });
            const [trx1, trx2] = await Promise.all([`TRN${GenerateUniqueId()}`, `TRN${GenerateUniqueId()}`]);
            const senderOptions = {
                transactionId: trx1,
                transaction: `Gifted ${points} points to user ${receiver?.username}`,
                userId, amount: points, transactionType: "debit",
                transactionMessage: `You gifted ${points} points to user ${receiver?.username}`,
                walletId: user?.UserWallet?.id,
            };
            const receiverOptions = {
                transactionId: trx2,
                transaction: `Received ${points} points from user ${user?.username}`,
                userId: receiver_id, amount: points, transactionType: "credit",
                transactionMessage: `You received ${points} points from user ${user?.username}`,
                walletId: receiver?.UserWallet?.id,
            };
            const tasks = [
                UserTransactionQueue.add("userTransaction", senderOptions, { removeOnComplete: true, attempts: 3 }),
                UserTransactionQueue.add("userTransaction", receiverOptions, { removeOnComplete: true, attempts: 3 }),
                EmailService.PostGiftSentEmail(GetSinglename(user?.fullname as string), String(user?.email), String(receiver?.username), points),
                EmailService.PostGiftReceivedEmail(GetSinglename(receiver?.fullname as string), String(receiver?.email), String(user?.username), points),
                query.notifications.create({
                    data: {
                        notification_id: `NOT${GenerateUniqueId()}`,
                        message: `You have received <strong>${points}</strong> points from user ${user?.username}`,
                        user_id: receiver_id,
                        action: "purchase",
                        url: "/wallet",
                    },
                }),
                query.notifications.create({
                    data: {
                        notification_id: `NOT${GenerateUniqueId()}`,
                        message: `You have gifted <strong>${points}</strong> points to user ${receiver?.username}`,
                        user_id: userId,
                        action: "purchase",
                        url: "/wallet",
                    },
                }),
                query.postGift.create({
                    data: {
                        post_id: findPost.id,
                        gifter_id: userId,
                        points,
                        receiver_id,
                    }
                })
            ];
            try {
                await Promise.all(tasks);
            } catch (error) {
                console.error("Error processing gift transaction:", error);
                throw error;
            }
            return {
                message: `You have successfully gifted ${points} points to ${receiver?.username}`,
                error: false,
            };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    // PayFor Post
    static async PayForPost(options: PayForPostProps): Promise<PayForPostResponse> {
        const { user, postId } = options;

        if (!postId) return this.errorResponse("Post Not Found");
        if (!user?.id) return this.errorResponse("User Not Found");

        try {
            const postIdNum = Number(postId);

            const [alreadyPurchased, post, userPoints] = await Promise.all([
                query.purchasedPosts.findFirst({
                    where: { user_id: user.id, post_id: postIdNum }
                }),
                query.post.findFirst({
                    where: { id: postIdNum },
                    include: {
                        user: {
                            select: { id: true, fullname: true, email: true, username: true }
                        }
                    }
                }),
                query.userPoints.findFirst({ where: { user_id: user.id } })
            ]);

            if (alreadyPurchased) {
                return this.successResponse("You have already purchased this post");
            }

            if (!post) return this.errorResponse("Post Not Found");

            const postPrice = post.post_price;
            if (!postPrice || postPrice <= 0) {
                return this.errorResponse("Post is not paid or is free");
            }

            if (!userPoints?.points || userPoints.points < postPrice) {
                return this.errorResponse("Insufficient points to purchase this post");
            }

            // Transaction to handle point transfers and post purchase
            await query.$transaction([
                query.userPoints.update({
                    where: { user_id: user.id },
                    data: { points: { decrement: postPrice } }
                }),
                query.userPoints.update({
                    where: { user_id: post.user_id },
                    data: { points: { increment: postPrice } }
                }),
                query.purchasedPosts.create({
                    data: {
                        user_id: user.id,
                        post_id: post.id,
                        price: postPrice,
                        purchase_id: `PUR${GenerateUniqueId()}`,
                    }
                })
            ]);

            // Wallets and transaction logs
            const [buyerWallet, sellerWallet] = await Promise.all([
                query.userWallet.findFirst({ where: { user_id: user.id } }),
                query.userWallet.findFirst({ where: { user_id: post.user_id } })
            ]);

            const [trx1, trx2] = [`TRN${GenerateUniqueId()}`, `TRN${GenerateUniqueId()}`];
            const senderOptions = {
                transactionId: trx1,
                transaction: `Purchased a post from ${post.user.username} for ${postPrice} points`,
                userId: user.id,
                amount: postPrice,
                transactionType: "debit",
                transactionMessage: `You purchased post ${post.post_id} for ${postPrice} points`,
                walletId: buyerWallet?.id
            };

            const receiverOptions = {
                transactionId: trx2,
                transaction: `Received ${postPrice} points from one of your fans`,
                userId: post.user_id,
                amount: postPrice,
                transactionType: "credit",
                transactionMessage: `You received ${postPrice} points for post ${post.post_id}`,
                walletId: sellerWallet?.id
            };

            // Background tasks: transaction logs & notifications
            await Promise.all([
                UserTransactionQueue.add("userTransaction", senderOptions, { removeOnComplete: true, attempts: 3 }),
                UserTransactionQueue.add("userTransaction", receiverOptions, { removeOnComplete: true, attempts: 3 }),
                query.notifications.create({
                    data: {
                        notification_id: `NOT${GenerateUniqueId()}`,
                        message: `You have purchased post <strong>${post.post_id}</strong> for <strong>${postPrice} points</strong>`,
                        user_id: user.id,
                        action: "purchase",
                        url: `${process.env.APP_URL}/posts/${post.post_id}`,
                    }
                }),
                query.notifications.create({
                    data: {
                        notification_id: `NOT${GenerateUniqueId()}`,
                        message: `Your post <strong>${post.post_id}</strong> has been purchased for <strong>${postPrice} points</strong>`,
                        user_id: post.user_id,
                        action: "purchase",
                        url: `${process.env.APP_URL}/posts/${post.post_id}`,
                    }
                })
            ]);

            return this.successResponse(`Post purchased successfully for ${postPrice} points`);

        } catch (error: any) {
            console.error("Error in PayForPost:", error);
            return this.errorResponse("An unexpected error occurred during the post purchase");
        }
    }

    // Helpers
    private static successResponse(message: string): PayForPostResponse {
        return { status: true, error: false, message };
    }

    private static errorResponse(message: string): PayForPostResponse {
        return { status: false, error: true, message };
    }

}