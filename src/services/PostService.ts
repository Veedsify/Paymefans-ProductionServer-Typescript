import type {
  CreatePostProps,
  CreatePostResponse,
  CreateRepostProps,
  DeletePostResponse,
  EditPostProps,
  EditPostResponse,
  GetMentionsProps,
  GetMentionsResponse,
  GetMyMediaProps,
  GetMyMediaResponse,
  GetMyPostProps,
  GetMyPostResponse,
  GetOtherMediaProps,
  GetOtherMediaResponse,
  GetPrivateMediaProps,
  GetPrivateMediaResponse,
  GetOtherPrivateMediaProps,
  GetOtherPrivateMediaResponse,
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
  UpdatePostProps,
  UpdatePostResponse,
} from "../types/post";
import { v4 as uuid } from "uuid";
import query from "@utils/prisma";
import { MediaState, PostAudience } from "@prisma/client";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";
import { CommentLikes, Comments } from "@utils/mongoSchema";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import EmailService from "./EmailService";
import GetSinglename from "@utils/GetSingleName";
import { redis } from "@libs/RedisStore";
import ParseContentToHtml from "@utils/ParseHtmlContent";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import { MentionService } from "./MentionService";
import { MentionNotificationQueue } from "@jobs/MentionNotificationJob";
import GenerateCloudflareSignedUrl from "@libs/GenerateSignedUrls";
import WatermarkService from "./WatermarkService";

export default class PostService {
  // Create Post
  static async CreatePost(
    data: CreatePostProps,
    authUserId: number,
  ): Promise<CreatePostResponse> {
    try {
      const postId = uuid();
      const user = await query.user.findUnique({
        where: { id: data.user.id },
      });

      if (!user) {
        throw new Error("User not found");
      }
      const { content, visibility, media, removedMedia, mentions, price } =
        data;

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
      // Allow posts without content if media is present, but visibility is always required
      if (!visibility) {
        return {
          status: false,
          error: true,
          message: "Visibility is required",
        };
      }

      // Check if both content and media are missing
      if (
        (!content || content.trim().length === 0) &&
        (!media || media.length === 0)
      ) {
        return {
          status: false,
          error: true,
          message: "Either content or media is required",
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
            media_state: (file.type === "image"
              ? "completed"
              : "processing") as MediaState,
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
          await RemoveCloudflareMedia(
            media.map((file) => ({ id: file.id, type: file.type })),
          );
          throw new Error(
            "Sorry You have reached the maximum media limit of 6, as a fan user. Upgrade to a model/creator account to unlock unlimited uploads and access all features as a content creator.",
          );
        }
      }

      const formattedContent = ParseContentToHtml(content, mentions || []);
      const isWaterMarkEnabled = WatermarkService.isUserWatermarkEnabled(
        user.id,
      );

      const post = await query.post.create({
        data: {
          post_id: postId,
          was_repost: false,
          content: formattedContent || "",
          post_audience: visibility as PostAudience,
          post_status: allImages ? "approved" : "pending",
          post_is_visible: true,
          user_id: user.id,
          watermark_enabled: !!isWaterMarkEnabled,
          post_price: visibility === "price" ? price : null,
          media: [],
          UserMedia: {
            createMany: { data: userMediaData },
          },
        },
      });

      // Process mentions if any
      if (mentions && mentions.length > 0) {
        const validMentions = await MentionService.validateMentions(
          mentions,
          authUserId,
        );

        if (validMentions.length > 0) {
          await MentionNotificationQueue.add(
            "processMentions",
            {
              mentions: validMentions,
              mentioner: {
                id: user.id,
                username: user.username,
                name: user.name || user.username,
              },
              type: "post",
              contentId: postId,
              content: content,
            },
            {
              removeOnComplete: true,
              attempts: 3,
            },
          );
        }
      }

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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

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
          watermark_enabled: true,
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
      const postIds = posts.map((post) => post.id);
      const [likes, reposts] = await Promise.all([
        query.postLike.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(reposts.map((r) => r.post_id));

      const resolvedPosts = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          isSubscribed: true,
          wasReposted: postRepostSet.has(post.id),
          hasPaid: true,
          likedByme: postLikesSet.has(post.id),
        })),
      );

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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
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
          watermark_enabled: true,
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

      const postIds = posts.map((post) => post.id);

      // Batch likes and reposts
      const [likes, reposts] = await Promise.all([
        query.postLike.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(reposts.map((r) => r.post_id));

      const resolvedPosts = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          likedByme: postLikesSet.has(post.id),
          wasReposted: postRepostSet.has(post.id),
          isSubscribed: true,
          hasPaid: true,
        })),
      );

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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const userRepostCount = await query.userRepost.count({
        where: { user_id: userId },
      });
      if (userRepostCount === 0) {
        return {
          status: false,
          hasMore: false,
          data: [],
          message: "No reposts found",
        };
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
              watermark_enabled: true,
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

      const reposts = userReposts.map((repost) => repost.post);
      const postIds = reposts.map((post) => post.id);
      // Batch likes and reposts
      const [likes, repostsDb, purchasedPosts] = await Promise.all([
        query.postLike.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(repostsDb.map((r) => r.post_id));
      const purchasedPostsSet = new Set(purchasedPosts.map((r) => r.post_id));

      const resolvedPosts = await Promise.all(
        reposts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          likedByme: postLikesSet.has(post.id),
          wasReposted: postRepostSet.has(post.id),
          hasPaid: purchasedPostsSet.has(post.id),
          isSubscribed: true,
        })),
      );

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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

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
              watermark_enabled: true,
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
      const reposts = userReposts.map((repost) => repost.post);
      const postIds = reposts.map((post) => post.id);
      // Batch likes and reposts
      const [likes, repostsDb, payedPosts] = await Promise.all([
        query.postLike.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: authUserId },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: authUserId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(repostsDb.map((r) => r.post_id));
      const purchasedPostsSet = new Set(payedPosts.map((l) => l.post_id));

      const resolvedPosts = await Promise.all(
        reposts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          likedByme: postLikesSet.has(post.id),
          wasReposted: postRepostSet.has(post.id),
          hasPaid:
            purchasedPostsSet.has(post.id) || post.post_audience !== "price",
          isSubscribed: true,
        })),
      );

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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      // get post ids by user, then fetch all that media in one go
      const postIds = (
        await query.post.findMany({
          where: { user_id: userId },
          select: { id: true },
        })
      ).map((p) => p.id);

      const [authUser, mediaCount, media] = await Promise.all([
        query.user.findUnique({
          where: { id: userId },
          select: { flags: true },
        }),
        query.userMedia.count({ where: { post_id: { in: postIds } } }),
        query.userMedia.findMany({
          where: { post_id: { in: postIds } },
          include: {
            post: {
              select: {
                watermark_enabled: true,
              },
            },
          },
          skip: (validPage - 1) * validLimit,
          take: validLimit,
          orderBy: { created_at: "desc" },
        }),
      ]);

      // Check if user has view_paid_media flag
      const hasViewPaidMediaFlag =
        (Array.isArray(authUser?.flags) &&
          authUser.flags.includes("view_paid_media")) ||
        false;

      // isSubscribed: true can be done without map over async
      const mediaChecked = await Promise.all(
        media.map(async (mediaFile) => ({
          ...mediaFile,
          url: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.url,
            )
            : mediaFile.url,
          poster: mediaFile.post.watermark_enabled
            ? mediaFile.media_type === "image"
              ? await GenerateCloudflareSignedUrl(
                mediaFile.media_id,
                mediaFile.media_type,
                mediaFile.url,
              )
              : mediaFile.poster
            : mediaFile.poster,
          blur: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.blur,
            )
            : mediaFile.blur,
          isSubscribed: true,
          hasPaid: hasViewPaidMediaFlag || mediaFile.accessible_to !== "price",
        })),
      );
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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      const postIds = (
        await query.post.findMany({
          where: { user_id: Number(userId) },
          select: { id: true },
        })
      ).map((p) => p.id);

      const [authUser, isSubscribed, media, payedPosts] = await Promise.all([
        query.user.findUnique({
          where: { id: Number(authUserId) },
          select: { flags: true },
        }),
        query.subscribers.findFirst({
          where: {
            subscriber_id: Number(authUserId),
            status: "active",
            user_id: Number(userId),
          },
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
                watermark_enabled: true,
                user: { select: { id: true } },
              },
            },
          },
          skip: (validPage - 1) * validLimit,
          take: validLimit + 1,
          orderBy: { created_at: "desc" },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: Number(authUserId) },
        }),
      ]);

      let hasMore = false;
      if (media.length > validLimit) {
        hasMore = true;
        media.pop();
      }

      // Check if user has view_paid_media flag
      const hasViewPaidMediaFlag =
        (Array.isArray(authUser?.flags) &&
          authUser.flags.includes("view_paid_media")) ||
        false;

      const purchasedPostsSet = new Set(payedPosts.map((l) => l.post_id));
      const resolvedMedia = await Promise.all(
        media.map(async (mediaFile) => ({
          ...mediaFile,
          url: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.url,
            )
            : mediaFile.url,
          poster: mediaFile.post.watermark_enabled
            ? mediaFile.media_type === "image"
              ? await GenerateCloudflareSignedUrl(
                mediaFile.media_id,
                mediaFile.media_type,
                mediaFile.url,
              )
              : mediaFile.poster
            : mediaFile.poster,
          blur: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.blur,
            )
            : mediaFile.blur,
          hasPaid:
            hasViewPaidMediaFlag ||
            purchasedPostsSet.has(mediaFile.post_id) ||
            mediaFile.accessible_to !== "price",
          isSubscribed:
            hasViewPaidMediaFlag ||
            mediaFile.post.user.id === Number(authUserId) ||
            !!isSubscribed,
        })),
      );

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

  // Get My Private Media
  static async GetPrivateMedia({
    userId,
    page,
    limit,
  }: GetPrivateMediaProps): Promise<GetPrivateMediaResponse> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 6;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      // get post ids by user, then fetch all that media in one go
      // Only get posts that are NOT public (private, subscribers, price)
      const postIds = (
        await query.post.findMany({
          where: {
            user_id: userId,
            NOT: { post_audience: "public" },
          },
          select: { id: true },
        })
      ).map((p) => p.id);

      const [authUser, mediaCount, media] = await Promise.all([
        query.user.findUnique({
          where: { id: userId },
          select: { flags: true },
        }),
        query.userMedia.count({
          where: {
            post_id: { in: postIds },
            NOT: { accessible_to: "public" },
          },
        }),
        query.userMedia.findMany({
          where: {
            post_id: { in: postIds },
            NOT: { accessible_to: "public" },
          },
          include: {
            post: {
              select: {
                watermark_enabled: true,
              },
            },
          },
          skip: (validPage - 1) * validLimit,
          take: validLimit,
          orderBy: { created_at: "desc" },
        }),
      ]);

      // Check if user has view_paid_media flag
      const hasViewPaidMediaFlag =
        (Array.isArray(authUser?.flags) &&
          authUser.flags.includes("view_paid_media")) ||
        false;

      // isSubscribed: true can be done without map over async
      const mediaChecked = await Promise.all(
        media.map(async (mediaFile) => ({
          ...mediaFile,
          url: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.url,
            )
            : mediaFile.url,
          poster: mediaFile.post.watermark_enabled
            ? mediaFile.media_type === "image"
              ? await GenerateCloudflareSignedUrl(
                mediaFile.media_id,
                mediaFile.media_type,
                mediaFile.url,
              )
              : mediaFile.poster
            : mediaFile.poster,
          blur: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.blur,
            )
            : mediaFile.blur,
          isSubscribed: true,
          hasPaid: hasViewPaidMediaFlag || mediaFile.accessible_to !== "price",
        })),
      );

      return {
        status: true,
        message: "Private Media retrieved successfully",
        data: mediaChecked,
        total: mediaCount,
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  // Get Other Private Media
  static async GetOtherPrivateMedia({
    userId,
    page,
    limit,
    authUserId,
  }: GetOtherPrivateMediaProps): Promise<GetOtherPrivateMediaResponse> {
    try {
      const parsedLimit = limit ? parseInt(limit, 10) : 6;
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      // Only get posts that are NOT public (private, subscribers, price)
      const postIds = (
        await query.post.findMany({
          where: {
            user_id: Number(userId),
            NOT: { post_audience: "public" },
          },
          select: { id: true },
        })
      ).map((p) => p.id);

      const [authUser, isSubscribed, media, payedPosts] = await Promise.all([
        query.user.findUnique({
          where: { id: Number(authUserId) },
          select: { flags: true },
        }),
        query.subscribers.findFirst({
          where: {
            subscriber_id: Number(authUserId),
            status: "active",
            user_id: Number(userId),
          },
        }),
        query.userMedia.findMany({
          where: {
            NOT: { accessible_to: "public" },
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
                watermark_enabled: true,
                user: { select: { id: true } },
              },
            },
          },
          skip: (validPage - 1) * validLimit,
          take: validLimit + 1,
          orderBy: { created_at: "desc" },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: Number(authUserId) },
        }),
      ]);

      let hasMore = false;
      if (media.length > validLimit) {
        hasMore = true;
        media.pop();
      }

      // Check if user has view_paid_media flag
      const hasViewPaidMediaFlag =
        (Array.isArray(authUser?.flags) &&
          authUser.flags.includes("view_paid_media")) ||
        false;

      const purchasedPostsSet = new Set(payedPosts.map((l) => l.post_id));
      const resolvedMedia = await Promise.all(
        media.map(async (mediaFile) => ({
          ...mediaFile,
          url: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.url,
            )
            : mediaFile.url,
          poster: mediaFile.post.watermark_enabled
            ? mediaFile.media_type === "image"
              ? await GenerateCloudflareSignedUrl(
                mediaFile.media_id,
                mediaFile.media_type,
                mediaFile.url,
              )
              : mediaFile.poster
            : mediaFile.poster,
          blur: mediaFile.post.watermark_enabled
            ? await GenerateCloudflareSignedUrl(
              mediaFile.media_id,
              mediaFile.media_type,
              mediaFile.blur,
            )
            : mediaFile.blur,
          hasPaid:
            hasViewPaidMediaFlag ||
            purchasedPostsSet.has(mediaFile.post_id) ||
            mediaFile.accessible_to !== "price",
          isSubscribed:
            hasViewPaidMediaFlag ||
            mediaFile.post.user.id === Number(authUserId) ||
            !!isSubscribed,
        })),
      );

      return {
        status: true,
        message: "Private Media retrieved successfully",
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
    authUserId,
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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
      const parsedUserId = Number(userId);

      const user = await query.user.findUnique({
        where: {
          id: authUserId,
        },
      });

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
          watermark_enabled: true,
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

      const postIds = posts.map((post) => post.id);
      // Batch queries
      const [subs, likes, reposts, payedPosts] = await Promise.all([
        query.subscribers.findFirst({
          where: {
            subscriber_id: authUserId,
            status: "active",
            user_id: parsedUserId,
          },
        }),
        query.postLike.findMany({
          where: {
            post_id: { in: postIds },
            user_id: posts.length ? posts[0].user.id : 0,
          },
        }), // note: original used post.user.id, possible logic bug
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: authUserId },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: authUserId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(reposts.map((r) => r.post_id));
      const purchasedPostsSet = new Set(payedPosts.map((l) => l.post_id));
      const checkIfUserCanViewPaidPosts = RBAC.checkUserFlag(
        user?.flags,
        Permissions.VIEW_PAID_POSTS,
      );

      const resolvedPosts = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          likedByme: postLikesSet.has(post.id),
          hasPaid:
            purchasedPostsSet.has(post.id) ||
            checkIfUserCanViewPaidPosts ||
            post.post_audience !== "price",
          wasReposted: postRepostSet.has(post.id),
          isSubscribed: checkIfUserCanViewPaidPosts || !!subs,
        })),
      );
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
      const validLimit =
        Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
      const parsedPage = page ? parseInt(page, 10) : 1;
      const validPage =
        Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;

      const user = await query.user.findUnique({
        where: {
          id: Number(authUserId),
        },
      });

      if (!user) throw new Error("User not found");

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
          watermark_enabled: true,
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
      const postIds = posts.map((post) => post.id);

      const [subs, likes, reposts, payedPosts] = await Promise.all([
        query.subscribers.findFirst({
          where: {
            subscriber_id: authUserId,
            status: "active",
            user_id: Number(userId),
          },
        }),
        query.postLike.findMany({
          where: {
            post_id: { in: postIds },
            user_id: posts.length ? posts[0].user.id : 0,
          },
        }),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: authUserId },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: userId },
        }),
      ]);
      const postLikesSet = new Set(likes.map((l) => l.post_id));
      const postRepostSet = new Set(reposts.map((r) => r.post_id));
      const purchasedPostsSet = new Set(payedPosts.map((l) => l.post_id));
      const resolvedPosts = await Promise.all(
        posts.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await Promise.all(
              (post.UserMedia || []).map(async (media) => ({
                ...media,
                url: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.url,
                ),
                poster:
                  media.media_type === "image"
                    ? await GenerateCloudflareSignedUrl(
                      media.media_id,
                      media.media_type,
                      media.url,
                    )
                    : media.poster,
                blur: await GenerateCloudflareSignedUrl(
                  media.media_id,
                  media.media_type,
                  media.blur,
                ),
              })),
            )
            : post.UserMedia,
          likedByme: postLikesSet.has(post.id),
          wasReposted: postRepostSet.has(post.id),
          hasPaid:
            purchasedPostsSet.has(post.id) || post.post_audience !== "price",
          isSubscribed: !!subs || post.user.id === authUserId,
        })),
      );

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
    authUserId,
  }: {
    postId: string;
    authUserId: number;
  }): Promise<GetSinglePostResponse> {
    try {
      const user = await query.user.findFirst({
        where: {
          id: authUserId,
        },
      });

      const post = await query.post.findFirst({
        where: {
          post_id: postId,
          post_status: "approved",
          NOT: [{ post_audience: "private" }],
          user: { active_status: true },
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
          watermark_enabled: true,
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
      const [postLike, isSubscribed, isReposted, isPaid] = await Promise.all([
        query.postLike.findFirst({
          where: { post_id: post.id, user_id: authUserId },
        }),
        query.subscribers.findFirst({
          where: {
            user_id: post.user_id,
            status: "active",
            subscriber_id: authUserId,
          },
        }),
        query.userRepost.findFirst({
          where: { post_id: post.id, user_id: authUserId },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: post.id, user_id: authUserId },
        }),
      ]);

      const checkIfUserCanViewPaidPost = RBAC.checkUserFlag(
        user?.flags,
        Permissions.VIEW_PAID_POSTS,
      );

      // Process UserMedia with conditional signed URLs
      const processedPost = {
        ...post,
        UserMedia: post.watermark_enabled
          ? await Promise.all(
            (post.UserMedia || []).map(async (media) => ({
              ...media,
              url: await GenerateCloudflareSignedUrl(
                media.media_id,
                media.media_type,
                media.url,
              ),
              poster:
                media.media_type === "image"
                  ? await GenerateCloudflareSignedUrl(
                    media.media_id,
                    media.media_type,
                    media.url,
                  )
                  : media.poster,
              blur: await GenerateCloudflareSignedUrl(
                media.media_id,
                media.media_type,
                media.blur,
              ),
            })),
          )
          : post.UserMedia,
      };

      return {
        error: false,
        status: true,
        message: "Post retrieved successfully",
        data: {
          ...processedPost,
          likedByme: !!postLike,
          wasReposted: !!isReposted,
          hasPaid:
            checkIfUserCanViewPaidPost ||
            post.post_audience !== "price" ||
            !!isPaid,
          isSubscribed:
            !!isSubscribed ||
            checkIfUserCanViewPaidPost ||
            post.user_id === authUserId,
        },
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  // Edit Post
  static async EditPost({
    postId,
    userId,
  }: EditPostProps): Promise<EditPostResponse> {
    try {
      const post = await query.post.findFirst({
        where: { post_id: postId, user_id: userId },
        select: {
          id: true,
          content: true,
          post_id: true,
          post_audience: true,
          post_price: true,
          created_at: true,
          post_status: true,
          post_impressions: true,
          post_likes: true,
          post_comments: true,
          watermark_enabled: true,
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

  // Update Post
  static async UpdatePost({
    postId,
    userId,
    content,
    visibility,
    media,
    removedMedia,
    mentions,
    price,
    isWaterMarkEnabled,
  }: UpdatePostProps): Promise<UpdatePostResponse> {
    try {
      // First, verify the post exists and belongs to the user
      const existingPost = await query.post.findFirst({
        where: { post_id: postId, user_id: userId },
        include: {
          UserMedia: true,
          user: {
            select: {
              id: true,
              username: true,
              name: true,
            },
          },
        },
      });

      if (!existingPost) {
        return {
          status: false,
          message: "Post not found or you don't have permission to edit it",
          error: true,
        };
      }

      // Handle removed media - delete from Cloudflare and database
      if (removedMedia && removedMedia.length > 0) {
        const removeMedia = await RemoveCloudflareMedia(removedMedia);
        if (removeMedia?.error) {
          return {
            status: false,
            message: "An error occurred while deleting media",
            error: true,
          };
        }

        // Remove media records from database
        const mediaIdsToRemove = removedMedia.map((m) => m.id);
        await query.userMedia.deleteMany({
          where: {
            media_id: { in: mediaIdsToRemove },
            post_id: existingPost.id,
          },
        });
      }

      // Prepare new media data
      const userMediaData: any[] = [];
      let allImages = true;

      if (media && media.length > 0) {
        for (const file of media) {
          if (!file?.id) continue;

          if (file.type !== "image") {
            allImages = false;
          }

          userMediaData.push({
            media_id: file.id,
            user_id: userId,
            post_id: existingPost.id,
            media_type: file.type,
            url: file.public,
            media_state: (file.type === "image"
              ? "completed"
              : "processing") as MediaState,
            blur: String(file.blur),
            poster: file.public,
            accessible_to: visibility || existingPost.post_audience,
            locked:
              (visibility || existingPost.post_audience) === "subscribers",
          });
        }
      }

      // Validate price for price posts
      if (visibility === "price" && (!price || price <= 0)) {
        return {
          status: false,
          error: true,
          message: "Price is required for price posts",
        };
      }

      // Check if both content and media are missing for updates
      const hasExistingMedia =
        existingPost.UserMedia && existingPost.UserMedia.length > 0;
      const hasNewMedia = media && media.length > 0;
      const hasContent = content && content.trim().length > 0;

      if (!hasContent && !hasExistingMedia && !hasNewMedia) {
        return {
          status: false,
          error: true,
          message: "Either content or media is required",
        };
      }

      // Format content with mentions
      const formattedContent = content
        ? ParseContentToHtml(content, mentions || [])
        : existingPost.content;

      // Determine post status based on media
      const currentMediaImages =
        existingPost.UserMedia?.filter((m) => m.media_type === "image") || [];
      const newMediaImages = userMediaData.filter(
        (m) => m.media_type === "image",
      );
      const hasOnlyImages =
        currentMediaImages.length > 0 || newMediaImages.length > 0
          ? allImages
          : true;

      // Update post in transaction
      const updatedPost = await query.$transaction(async (tx) => {
        // Update the post
        const post = await tx.post.update({
          where: { id: existingPost.id },
          data: {
            content: formattedContent,
            post_audience:
              (visibility as PostAudience) || existingPost.post_audience,
            post_status: hasOnlyImages ? "approved" : "pending",
            post_price:
              visibility === "price"
                ? price
                : visibility === "public" || visibility === "subscribers"
                  ? null
                  : existingPost.post_price,
          },
        });

        // Add new media if any
        if (userMediaData.length > 0) {
          await tx.userMedia.createMany({
            data: userMediaData,
          });
        }

        // Update existing media accessibility if visibility changed
        if (visibility && visibility !== existingPost.post_audience) {
          await tx.userMedia.updateMany({
            where: { post_id: existingPost.id },
            data: {
              accessible_to: visibility,
              locked: visibility === "subscribers",
            },
          });
        }

        return post;
      });

      // Process mentions if any
      if (mentions && mentions.length > 0) {
        const validMentions = await MentionService.validateMentions(
          mentions,
          userId,
        );

        if (validMentions.length > 0) {
          await MentionNotificationQueue.add(
            "processMentions",
            {
              mentions: validMentions,
              mentioner: {
                id: userId,
                username: existingPost.user?.username || "Unknown",
                name:
                  existingPost.user?.name ||
                  existingPost.user?.username ||
                  "Unknown",
              },
              type: "post",
              contentId: postId,
              content: content || "",
            },
            {
              removeOnComplete: true,
              attempts: 3,
            },
          );
        }
      }

      return {
        status: true,
        message: "Post updated successfully",
        data: updatedPost,
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
            post_audience: String(visibility)
              .trim()
              .toLowerCase() as PostAudience,
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

  static async CreateRepost({
    postId,
    userId,
  }: CreateRepostProps): Promise<RepostResponse> {
    try {
      const audienceTypes = ["private", "subscribers", "followers"];
      const getPost = await query.post.findFirst({
        where: { post_id: postId, post_status: "approved" },
        select: {
          post_audience: true,
          user: { select: { id: true } },
          id: true,
        },
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
            message:
              "You are not a subscriber of this post, therefore you cannot repost it",
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
        return {
          error: false,
          message: "You unreposted the post successfully",
        };
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
  static async GetPostComments({
    postId,
    userId,
    page = "1",
    limit = "10",
  }: GetPostCommentsProps): Promise<GetPostCommentsResponse> {
    const countComments = await Comments.countDocuments({
      postId: String(postId),
    });
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Get post author info for relevance scoring
    const post = await query.post.findFirst({
      where: { post_id: String(postId) },
      select: { user_id: true },
    });

    // Get user's relationships for relevance scoring
    const [following, subscriptions] = await Promise.all([
      query.follow.findMany({
        where: { user_id: userId },
        select: { follower_id: true },
      }),
      query.subscribers.findMany({
        where: { subscriber_id: userId },
        select: { user_id: true },
      }),
    ]);

    const followingIds = following.map((f) => f.follower_id);
    const subscribedToIds = subscriptions.map((s) => s.user_id);

    // Get comments with relevance scoring
    const comments = await Comments.aggregate([
      {
        $match: {
          postId: String(postId),
          parentId: null,
        },
      },
      {
        $addFields: {
          relevanceScore: {
            $add: [
              // Own comments get highest priority
              { $cond: [{ $eq: ["$userId", userId] }, 1000, 0] },
              // Post author comments get high priority
              { $cond: [{ $eq: ["$userId", post?.user_id || 0] }, 100, 0] },
              // Comments from subscribed users
              { $cond: [{ $in: ["$userId", subscribedToIds] }, 75, 0] },
              // Comments from followed users
              { $cond: [{ $in: ["$userId", followingIds] }, 50, 0] },
              // Engagement score (likes + replies)
              { $add: ["$likes", "$replies"] },
              // Recent comments get slight boost (within 24 hours)
              {
                $cond: [
                  {
                    $gte: [
                      "$date",
                      { $subtract: [new Date(), 24 * 60 * 60 * 1000] },
                    ],
                  },
                  10,
                  0,
                ],
              },
            ],
          },
        },
      },
      {
        $sort: {
          relevanceScore: -1,
          date: -1,
        },
      },
      { $skip: skip },
      { $limit: limitInt + 1 },
    ]);

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

    // Get comment likes for current user
    const commentLikes = await CommentLikes.find({
      commentId: { $in: comments.map((c) => c.comment_id) },
      userId: userId,
    });

    // Get child comments for each parent comment (limited to 3 initially)
    const commentIds = comments.map((c) => c.comment_id);
    const childComments = await Comments.find({
      parentId: { $in: commentIds },
    })
      .sort({ date: 1 }) // Child comments in chronological order
      .limit(commentIds.length * 3); // Max 3 child comments per parent initially

    // Group child comments by parent
    const childCommentsMap = childComments.reduce(
      (acc, child) => {
        if (!acc[child.parentId]) {
          acc[child.parentId] = [];
        }
        acc[child.parentId].push(child);
        return acc;
      },
      {} as Record<string, any[]>,
    );

    // Get total child comment counts
    const childCounts = await Comments.aggregate([
      {
        $match: {
          parentId: { $in: commentIds },
        },
      },
      {
        $group: {
          _id: "$parentId",
          totalReplies: { $sum: 1 },
        },
      },
    ]);

    const childCountsMap = childCounts.reduce(
      (acc, item) => {
        acc[item._id] = item.totalReplies;
        return acc;
      },
      {} as Record<string, number>,
    );

    const checkedComments = comments.map((comment) => ({
      ...comment,
      likedByme: commentLikes.some(
        (like) => like.commentId === comment.comment_id,
      ),
      children: childCommentsMap[comment.comment_id] || [],
      totalReplies: childCountsMap[comment.comment_id] || 0,
      hasMoreReplies: (childCountsMap[comment.comment_id] || 0) > 3,
    }));

    return {
      error: false,
      message: "Comments found",
      data: checkedComments,
      hasMore,
      total: countComments,
    };
  }

  // Get Comment Replies
  static async GetCommentReplies({
    commentId,
    userId,
    page = "1",
    limit = "10",
  }: {
    commentId: string;
    userId: number;
    page?: string;
    limit?: string;
  }): Promise<{
    error: boolean;
    message: string;
    data: any[];
    hasMore: boolean;
    total: number;
  }> {
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitInt = parseInt(limit);

    // Get total count of replies
    const totalReplies = await Comments.countDocuments({
      parentId: commentId,
    });

    // Get replies with pagination
    const replies = await Comments.find({
      parentId: commentId,
    })
      .sort({ date: 1 }) // Chronological order for replies
      .skip(skip)
      .limit(limitInt + 1);

    const hasMore = replies.length > limitInt;
    if (hasMore) replies.pop();

    if (!replies || replies.length === 0) {
      return {
        error: false,
        message: "No replies found",
        data: [],
        hasMore: false,
        total: 0,
      };
    }

    // Get likes for current user on these replies
    const replyLikes = await CommentLikes.find({
      commentId: { $in: replies.map((r) => r.comment_id) },
      userId: userId,
    });

    const checkedReplies = replies.map((reply) => ({
      ...reply.toObject(),
      likedByme: replyLikes.some((like) => like.commentId === reply.comment_id),
    }));

    return {
      error: false,
      message: "Replies found",
      data: checkedReplies,
      hasMore,
      total: totalReplies,
    };
  }

  // Like A Post
  static async LikePost({
    postId,
    userId,
  }: LikePostProps): Promise<LikePostResponse> {
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
  static async DeletePost({
    postId,
    userId,
  }: {
    postId: string;
    userId: number;
  }): Promise<DeletePostResponse> {
    try {
      const post = await query.post.findFirst({
        where: { post_id: postId, user_id: userId },
      });
      if (!post) {
        return { status: false, message: "Post not found" };
      }
      const postMedia = await query.userMedia.findMany({
        where: { post_id: post.id },
        select: { media_id: true, media_type: true },
      });

      // Use transaction to delete post+media
      await query.$transaction(async (tx) => {
        await tx.userMedia.deleteMany({ where: { post_id: post.id } });
        await tx.postLike.deleteMany({ where: { post_id: post.id } });
        await tx.userRepost.deleteMany({ where: { post_id: post.id } });
        await tx.postGift.deleteMany({ where: { post_id: post.id } });
        await tx.post.delete({ where: { id: post.id } });
      });

      if (postMedia.length > 0) {
        const removeMedia = await RemoveCloudflareMedia(
          postMedia.map((m) => ({ id: m.media_id, type: m.media_type })),
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
  static async GiftPoints(
    options: GiftPointsProps,
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
      const receiver = await query.user.findFirst({
        where: { id: receiver_id },
        include: { UserWallet: true },
      });
      const [trx1, trx2] = await Promise.all([
        `TRN${GenerateUniqueId()}`,
        `TRN${GenerateUniqueId()}`,
      ]);
      const senderOptions = {
        transactionId: trx1,
        transaction: `Gifted ${points} points to user ${receiver?.username}`,
        userId,
        amount: points,
        transactionType: "debit",
        transactionMessage: `You gifted ${points} points to user ${receiver?.username}`,
        walletId: user?.UserWallet?.id,
      };
      const receiverOptions = {
        transactionId: trx2,
        transaction: `Received ${points} points from user ${user?.username}`,
        userId: receiver_id,
        amount: points,
        transactionType: "credit",
        transactionMessage: `You received ${points} points from user ${user?.username}`,
        walletId: receiver?.UserWallet?.id,
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
          points,
        ),
        EmailService.PostGiftReceivedEmail(
          GetSinglename(receiver?.fullname as string),
          String(receiver?.email),
          String(user?.username),
          points,
        ),
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
          },
        }),
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
  static async PayForPost(
    options: PayForPostProps,
  ): Promise<PayForPostResponse> {
    const { user, postId } = options;

    if (!postId) return this.errorResponse("Post Not Found");
    if (!user?.id) return this.errorResponse("User Not Found");

    try {
      const postIdNum = Number(postId);

      const [alreadyPurchased, post, userPoints] = await Promise.all([
        query.purchasedPosts.findFirst({
          where: { user_id: user.id, post_id: postIdNum },
        }),
        query.post.findFirst({
          where: { id: postIdNum },
          include: {
            user: {
              select: { id: true, fullname: true, email: true, username: true },
            },
          },
        }),
        query.userPoints.findFirst({ where: { user_id: user.id } }),
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
          data: { points: { decrement: postPrice } },
        }),
        query.userPoints.update({
          where: { user_id: post.user_id },
          data: { points: { increment: postPrice } },
        }),
        query.purchasedPosts.create({
          data: {
            user_id: user.id,
            post_id: post.id,
            price: postPrice,
            purchase_id: `PUR${GenerateUniqueId()}`,
          },
        }),
      ]);

      // Wallets and transaction logs
      const [buyerWallet, sellerWallet] = await Promise.all([
        query.userWallet.findFirst({ where: { user_id: user.id } }),
        query.userWallet.findFirst({ where: { user_id: post.user_id } }),
      ]);

      const [trx1, trx2] = [
        `TRN${GenerateUniqueId()}`,
        `TRN${GenerateUniqueId()}`,
      ];
      const senderOptions = {
        transactionId: trx1,
        transaction: `Purchased a post from ${post.user.username} for ${postPrice} points`,
        userId: user.id,
        amount: postPrice,
        transactionType: "debit",
        transactionMessage: `You purchased post ${post.post_id} for ${postPrice} points`,
        walletId: buyerWallet?.id,
      };

      const receiverOptions = {
        transactionId: trx2,
        transaction: `Received ${postPrice} points from one of your fans`,
        userId: post.user_id,
        amount: postPrice,
        transactionType: "credit",
        transactionMessage: `You received ${postPrice} points for post ${post.post_id}`,
        walletId: sellerWallet?.id,
      };

      // Background tasks: transaction logs & notifications
      await Promise.all([
        UserTransactionQueue.add("userTransaction", senderOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserTransactionQueue.add("userTransaction", receiverOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
        query.notifications.create({
          data: {
            notification_id: `NOT${GenerateUniqueId()}`,
            message: `You have purchased post <strong>${post.post_id}</strong> for <strong>${postPrice} points</strong>`,
            user_id: user.id,
            action: "purchase",
            url: `${process.env.APP_URL}/posts/${post.post_id}`,
          },
        }),
        query.notifications.create({
          data: {
            notification_id: `NOT${GenerateUniqueId()}`,
            message: `Your post <strong>${post.post_id}</strong> has been purchased for <strong>${postPrice} points</strong>`,
            user_id: post.user_id,
            action: "purchase",
            url: `${process.env.APP_URL}/posts/${post.post_id}`,
          },
        }),
      ]);

      return this.successResponse(
        `Post purchased successfully for ${postPrice} points`,
      );
    } catch (error: any) {
      console.error("Error in PayForPost:", error);
      return this.errorResponse(
        "An unexpected error occurred during the post purchase",
      );
    }
  }

  // Get Mentions
  static async GetMentions({
    query: searchQuery,
    userId,
  }: GetMentionsProps): Promise<GetMentionsResponse> {
    try {
      if (!searchQuery || searchQuery.trim() === "") {
        return {
          status: false,
          message: "Search query cannot be empty",
          mentions: [],
        };
      }

      const mentionsKey = `mentions:${searchQuery.toLowerCase()}:${userId}`;

      const cachedMentions = await redis.get(mentionsKey);

      if (cachedMentions) {
        return {
          status: true,
          message: "Mentions retrieved from cache",
          mentions: JSON.parse(cachedMentions),
        };
      }

      const findMentions = await query.user.findMany({
        where: {
          OR: [
            { username: { contains: searchQuery, mode: "insensitive" } },
            { name: { contains: searchQuery, mode: "insensitive" } },
          ],
          NOT: {
            flags: {
              array_contains: Permissions.CANT_MENTION,
            },
          },
          id: { not: userId }, // Exclude the current user
        },
        select: {
          id: true,
          username: true,
          profile_image: true,
          name: true,
        },
        take: 10, // Limit results to 10
      });

      if (findMentions.length === 0) {
        return {
          status: false,
          message: "No mentions found",
          mentions: [],
        };
      }

      // Cache the results for 2 minutes
      await redis.set(mentionsKey, JSON.stringify(findMentions), "EX", 120);

      return {
        status: true,
        message: "Mentions retrieved successfully",
        mentions: findMentions,
      };
    } catch (error: any) {
      console.error("Error in GetMentions:", error);
      throw new Error("An unexpected error occurred while fetching mentions");
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
