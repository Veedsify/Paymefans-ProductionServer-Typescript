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
  RepostProps,
  RepostResponse,
} from "../types/post";
import { v4 as uuid } from "uuid";
import query from "@utils/prisma";
import { PostAudience } from "@prisma/client";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";
import { Comments } from "@utils/mongoSchema";
import { redis } from "@libs/RedisStore";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { UserTransactionQueue } from "@jobs/notifications/UserTransactionJob";
import EmailService from "./EmailService";
import GetSinglename from "@utils/GetSingleName";
export default class PostService {
  // Create Post
  static async CreatePost(data: CreatePostProps): Promise<CreatePostResponse> {
    try {
      const postId = uuid();
      const user = data.user;
      const { content, visibility, media, removedMedia } = data;
      if (removedMedia) {
        const removeMedia = await RemoveCloudflareMedia(removedMedia);
        if ("error" in removeMedia && removeMedia.error) {
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
      // All Images
      const allImages = media.every((file) => file.type === "image");
      // Continue with the rest of your logic
      const post = await query.post.create({
        data: {
          post_id: postId,
          was_repost: false,
          content: content ? content : "",
          post_audience: visibility as PostAudience,
          post_status: allImages ? "approved" : "pending",
          post_is_visible: true,
          user_id: user.id,
          media: [],
          UserMedia: {
            createMany: {
              data: media
                .map((file) => {
                  if (file && file.id) {
                    return {
                      media_id: file.id,
                      media_type: file.type,
                      url: file.public,
                      media_state: file.type.includes("image")
                        ? "completed"
                        : "processing",
                      blur: file.blur,
                      poster: file.public,
                      accessible_to: visibility,
                      locked: visibility === "subscribers",
                    };
                  } else {
                    console.error("Invalid file response:", file);
                    return null;
                  }
                })
                .filter(Boolean) as any[],
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
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const posts = await query.post.findMany({
        where: {
          user_id: userId,
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
        orderBy: {
          created_at: "desc",
        },
      });
      let hasMore = false;
      if (posts.length > validLimit) {
        hasMore = true;
        posts.pop();
      }

      const postsChecked = posts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      return {
        status: true,
        message: "Posts retrieved successfully",
        data: resolvedPosts,
        hasMore: hasMore,
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
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const posts = await query.post.findMany({
        where: {
          user_id: userId,
          OR: [
            { post_audience: "price" },
            { post_audience: "subscribers" },
            { post_audience: "private" },
          ],
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
        orderBy: {
          created_at: "desc",
        },
      });

      let hasMore = false;
      if (posts.length > validLimit) {
        hasMore = true;
        posts.pop();
      }

      const postsChecked = posts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      return {
        status: true,
        message: "Posts retrieved successfully",
        data: resolvedPosts,
        hasMore: hasMore,
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
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const redisKey = `user-repost-${userId}-page-${page}-limit-${parsedLimit}`;
      // Parse page to an integer or default to 1 if not provided
      const userRepostCount = await query.userRepost.count({
        where: {
          user_id: userId,
        },
      });
      if (userRepostCount === 0) {
        return {
          status: false,
          hasMore: false,
          data: [],
          message: "No reposts found",
        };
      }
      const RepostRedisCache = await redis.get(redisKey);
      if (RepostRedisCache) {
        const parsedRepost = JSON.parse(RepostRedisCache);
        return {
          status: true,
          message: "Reposts retrieved successfully",
          data: parsedRepost,
          hasMore: parsedRepost.length > validLimit,
        };
      }
      const userReposts = await query.userRepost.findMany({
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
        skip: (Number(page) - 1) * validLimit,
        take: validLimit + 1,
        orderBy: {
          id: "desc",
        },
      });
      let hasMore = false;
      if (userReposts.length > validLimit) {
        hasMore = true;
      }
      const reposts = userReposts.map((repost) => repost.post);
      const postsChecked = reposts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      await redis.set(redisKey, JSON.stringify(resolvedPosts), "EX", 60);
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
  }: RepostProps): Promise<GetMyPostResponse> {
    try {
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const userReposts = await query.userRepost.findMany({
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
        orderBy: {
          id: "desc",
        },
      });

      let hasMore = false;
      if (userReposts.length > validLimit) {
        hasMore = true;
        userReposts.pop();
      }
      const reposts = userReposts.map((repost) => repost.post);
      const postsChecked = reposts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      return {
        status: true,
        message: "Reposts retrieved successfully",
        data: resolvedPosts,
        hasMore: hasMore,
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
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 6;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const postCount = await query.post.findMany({
        where: {
          user_id: userId,
        },
      });
      const mediaCount = await query.userMedia.count({
        where: {
          OR: [...postCount.map((post) => ({ post_id: post.id }))],
        },
      });
      const media = await query.userMedia.findMany({
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
  }: GetOtherMediaProps): Promise<GetOtherMediaResponse> {
    try {
      // Parse limit to an integer or default to 5 if not provided
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 6;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const postCount = await query.post.findMany({
        where: {
          user_id: Number(userId),
        },
      });
      const media = await query.userMedia.findMany({
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
                  id: true,
                },
              },
            },
          },
        },
        skip: (validPage - 1) * validLimit,
        take: validLimit + 1,
        orderBy: {
          created_at: "desc",
        },
      });

      let hasMore = false;
      if (media.length > validLimit) {
        hasMore = true;
        media.pop();
      }

      return {
        status: true,
        message: "Media retrieved successfully",
        data: media,
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
  }: GetUserPostByIdProps): Promise<GetUserPostByIdResponse> {
    try {
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      let posts = await query.post.findMany({
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
        take: validLimit + 1,
      });

      let hasMore = false;
      if (posts.length > validLimit) {
        posts.pop();
        hasMore = true;
      }

      const postsChecked = posts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      return {
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
  // Get User Post By User ID
  static async GetUserPrivatePostByID({
    userId,
    page,
    limit,
  }: GetUserPostByIdProps): Promise<GetUserPostByIdResponse> {
    try {
      // Parse limit to an integer or default to 5 if not provided
      const parsedLimit = limit ? parseInt(limit, 10) : 5;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      // Parse page to an integer or default to 1 if not provided
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      let posts = await query.post.findMany({
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
        take: validLimit + 1,
      });

      let hasMore = false;
      if (posts.length > validLimit) {
        posts.pop();
        hasMore = true;
      }

      const postsChecked = posts.map(async (post) => {
        const postLike = await query.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });
        return {
          ...post,
          likedByme: postLike ? true : false,
        };
      });
      const resolvedPosts = await Promise.all(postsChecked);
      return {
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
  // Get Single Post By ID:
  static async GetSinglePost({
    postId,
  }: {
    postId: string;
  }): Promise<GetSinglePostResponse> {
    try {
      const post = await query.post.findFirst({
        where: {
          post_id: postId,
          post_status: "approved",
          NOT: [
            {
              post_audience: "private",
            },
          ],
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
      const postLike = await query.postLike.findFirst({
        where: {
          post_id: post.id,
          user_id: post.user_id,
        },
      });
      const likedByme = postLike ? true : false;
      return {
        error: false,
        status: true,
        message: "Post retrieved successfully",
        data: { ...post, likedByme },
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
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }
  // Update PostAudience
  static async UpdatePostAudience({
    postId,
    userId,
    visibility,
  }: {
    postId: string;
    userId: number;
    visibility: string;
  }): Promise<any> {
    try {
      const findPost = await query.post.findFirst({
        where: {
          post_id: postId,
          user_id: userId,
        },
      });
      if (!findPost) {
        return { error: true, message: "Post not found" };
      }
      const [updatePost, updateMedia] = await query.$transaction([
        query.post.update({
          where: {
            id: findPost.id,
          },
          data: {
            post_audience: String(visibility)
              .trim()
              .toLowerCase() as PostAudience,
          },
        }),
        query.userMedia.updateMany({
          where: {
            post_id: findPost.id,
          },
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
  // Create Repost
  static async CreateRepost({
    postId,
    userId,
  }: CreateRepostProps): Promise<RepostResponse> {
    try {
      const audienceTypes = ["private", "subscribers", "followers"];
      // Repost the post
      const getPost = await query.post.findFirst({
        where: {
          post_id: postId,
          post_status: "approved",
        },
        select: {
          post_audience: true,
          user: {
            select: {
              id: true,
            },
          },
          id: true,
        },
      });
      if (!getPost) {
        return {
          error: true,
          message: "Post not found",
        };
      }
      const postAudience = getPost.post_audience;
      if (audienceTypes.includes(postAudience)) {
        const isSubscriber = await query.post.findFirst({
          where: {
            post_id: postId,
            user: {
              Subscribers: {
                some: {
                  subscriber_id: userId,
                },
              },
            },
          },
        });
        if (!isSubscriber && getPost.user.id !== userId) {
          return {
            error: true,
            message:
              "You are not a subscriber of this post, therefore you cannot repost it",
          };
        }
      }
      const repostId = uuid();
      const repost = await query.$transaction(async (transaction) => {
        const repost = await transaction.userRepost.create({
          data: {
            post_id: getPost.id,
            user_id: userId,
            repost_id: repostId,
          },
        });
        await transaction.post.update({
          where: {
            id: getPost.id,
          },
          data: {
            post_reposts: {
              increment: 1,
            },
          },
        });
        return repost;
      });
      if (repost) {
        query.$disconnect();
        return {
          error: false,
          message: "Post reposted successfully",
        };
      }
      return {
        error: true,
        message: "An error occurred while reposting the post",
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  // Get Post Comments
  static async GetPostComments({
    postId,
    page = "1",
    limit = "10",
  }: GetPostCommentsProps): Promise<GetPostCommentsResponse> {
    const countComments = await Comments.countDocuments({
      postId: Number(postId),
    });
    const comments = await Comments.find({
      postId: Number(postId),
    })
      .sort({ date: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit) + 1); // Fetch one extra for pagination check
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
        total: 0,
      };
    }
    return {
      error: false,
      message: "Comments found",
      data: comments,
      hasMore: hasMore,
      total: countComments,
    };
  }
  // Like A Post
  static async LikePost({
    postId,
    userId,
  }: LikePostProps): Promise<LikePostResponse> {
    try {
      let postHasBeenLiked = false;
      let postLike = null;
      // Verify if post has been liked by user
      const postLiked = await query.postLike.findFirst({
        where: {
          post_id: parseInt(postId),
          user_id: userId,
        },
      });
      if (!postLiked) {
        postLike = await query.postLike.create({
          data: {
            post_id: parseInt(postId),
            like_id: 1,
            user_id: userId,
          },
        });
        await query.post.update({
          where: {
            id: Number(postId),
          },
          data: {
            post_likes: {
              increment: 1,
            },
          },
        });
        postHasBeenLiked = true;
      } else {
        await query.postLike.delete({
          where: {
            id: postLiked.id,
          },
        });
        postLike = await query.post.update({
          where: {
            id: parseInt(postId),
          },
          data: {
            post_likes: {
              decrement: 1,
            },
          },
        });
      }
      return {
        ...postLike,
        success: true,
        isLiked: postHasBeenLiked,
        message: postHasBeenLiked
          ? "Post has been liked"
          : "Post has been unliked",
      };
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  }
  // Delete Post
  static async DeletePost({
    postId,
    userId,
  }: {
    postId: string;
    userId: number;
  }): Promise<DeletePostResponse> {
    try {
      const post = await query.post.findFirst({
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
      const postMedia = await query.userMedia.findMany({
        where: {
          post_id: post.id,
        },
      });
      if (postMedia.length > 0) {
        const media = postMedia.map((media) => ({
          id: media.media_id,
          type: media.media_type,
        }));
        console.log("Media", media);
        if (media && media.length > 0) {
          const removeMedia = await RemoveCloudflareMedia(media);
          if ("error" in removeMedia && removeMedia.error) {
            return {
              status: false,
              message: "An error occurred while deleting media",
              error: removeMedia.error,
            };
          }
        }
      }
      await query.post.delete({
        where: {
          id: post.id,
        },
      });
      await Comments.deleteMany({
        postId: Number(post.id),
      });
      return {
        status: true,
        message: "Post deleted successfully",
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }
  // Gift Points
  static async GiftPoints(
    options: GiftPointsProps
  ): Promise<{ message: string; error: boolean }> {
    try {
      if (!options.points || !options.userId || !options.postId) {
        return {
          message: "Points, userId and postId are required",
          error: true,
        };
      }
      const { points, userId, postId, receiver_id } = options;
      const findPost = await query.post.findFirst({
        where: {
          post_id: postId,
          user_id: receiver_id,
        },
      });
      if (!findPost) {
        return {
          message: "Post not found",
          error: true,
        };
      }
      // Check if the user has enough points
      const user = await query.user.findFirst({
        where: {
          id: userId,
        },
        include: {
          UserPoints: true,
        },
      });
      if (user?.UserPoints && user?.UserPoints?.points < points) {
        return {
          message: "You do not have enough points",
          error: true,
        };
      }
      // Deduct points from the user and add to the receiver in a transaction
      await query.$transaction([
        query.user.update({
          where: {
            id: userId,
          },
          data: {
            UserPoints: {
              update: {
                points: {
                  decrement: points,
                },
              },
            },
          },
        }),
        query.user.update({
          where: {
            id: receiver_id,
          },
          data: {
            UserPoints: {
              update: {
                points: {
                  increment: points,
                },
              },
            },
          },
        }),
      ]);

      // Receiver
      const receiver = await query.user.findFirst({
        where: {
          id: receiver_id,
        },
      });
      const [trx1, trx2] = await Promise.all([
        `TRN${GenerateUniqueId()}`,
        `TRN${GenerateUniqueId()}`,
      ]);
      const senderOptions = {
        transactionId: trx1,
        transaction: `Gifted ${points} points to user ${receiver?.username}`,
        userId: userId,
        amount: points,
        transactionType: "debit",
        transactionMessage: `You gifted ${points} points to user ${receiver?.username}`,
        walletId: 1,
      };
      const receiverOptions = {
        transactionId: trx2,
        transaction: `Received ${points} points from user ${user?.username}`,
        userId: receiver_id,
        amount: points,
        transactionType: "credit",
        transactionMessage: `You received ${points} points from user ${user?.username}`,
        walletId: 1,
      };
      const tasks = [
        UserTransactionQueue.add("userTransaction", senderOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserTransactionQueue.add("userTransaction", receiverOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
        EmailService.PostGiftSentEmail(
          GetSinglename(user?.fullname as string),
          String(user?.email),
          String(receiver?.username),
          points
        ),
        EmailService.PostGiftReceivedEmail(
          GetSinglename(receiver?.fullname as string),
          String(receiver?.email),
          String(user?.username),
          points
        ),
        query.notifications.create({
          data: {
            notification_id: `NOTI${GenerateUniqueId()}`,
            message: `You have received <strong>${points}</strong> points from user ${user?.username}`,
            user_id: receiver_id,
            action: "purchase",
            url: "/wallet",
          },
        }),
        query.notifications.create({
          data: {
            notification_id: `NOTI${GenerateUniqueId()}`,
            message: `You have gifted <strong>${points}</strong> points to user ${receiver?.username}`,
            user_id: userId,
            action: "purchase",
            url: "/wallet",
          },
        }),
      ];

      try {
        await Promise.all(tasks);
      } catch (error) {
        console.error("Error processing gift transaction:", error);
        throw error; // Or handle partial failures differently
      }

      //  Return
      return {
        message: `You have successfully gifted ${points} points to ${receiver?.username}`,
        error: false,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
  // Handle Gift Transaction
}
