import { redis } from "@libs/RedisStore";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import query from "@utils/prisma";
import { SearchPlatformResponse } from "types/search";
import { AuthUser } from "types/user";
import { GenerateBatchSignedUrls } from "@libs/GenerateSignedUrls";
import { RedisPostService } from "./RedisPostService";

export default class SearchService {
  private static async searchInPosts(
    searchQuery: string,
    authUserid: number
  ): Promise<any> {
    const cacheKey = `search:posts:${searchQuery}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const user = await query.user.findUnique({
      where: {
        id: authUserid,
      },
    });

    const checkIfUserCanViewPaidPosts = RBAC.checkUserFlag(
      user?.flags,
      Permissions.VIEW_PAID_POSTS
    );

    const results = await query.post.findMany({
      where: {
        OR: [
          { content: { contains: searchQuery, mode: "insensitive" } },
          { post_id: { contains: searchQuery, mode: "insensitive" } },
          {
            user: {
              username: { contains: searchQuery, mode: "insensitive" },
              name: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },
        ],
      },
      select: {
        id: true,
        content: true,
        post_id: true,
        post_audience: true,
        media: true,
        created_at: true,
        updated_at: true,
        post_status: true,
        post_impressions: true,
        post_likes: true,
        post_comments: true,
        watermark_enabled: true,
        post_reposts: true,
        was_repost: true,
        repost_id: true,
        repost_username: true,
        user_id: true,
        post_is_visible: true,
        post_price: true,
        user: {
          select: {
            id: true,
            user_id: true,
            username: true,
            name: true,
            profile_image: true,
          },
        },
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
      },
    });

    if (results.length === 0) {
      return [];
    }

    // Get post IDs for batch operations
    const postIds = results.map((post) => post.id);
    const postIdStrings = results.map((post) => post.post_id);

    // Batch fetch like data from Redis and other relationships
    const [likeData, subscriptions, reposts] = await Promise.all([
      RedisPostService.getMultiplePostsLikeData(postIdStrings, authUserid),
      query.subscribers.findMany({
        where: {
          user_id: { in: results.map((post) => post.user.id) },
          subscriber_id: authUserid,
        },
      }),
      query.userRepost.findMany({
        where: {
          user_id: authUserid,
          post_id: { in: postIds },
        },
      }),
    ]);

    const subscriptionMap = new Map(subscriptions.map((s) => [s.user_id, s]));
    const repostMap = new Map(reposts.map((r) => [r.post_id, r]));

    const postsChecked = results.map(async (post) => {
      const likeInfo = likeData.get(post.post_id) || {
        count: post.post_likes,
        isLiked: false,
      };
      const isSubscribed = subscriptionMap.get(post.user.id);
      const isReposted = repostMap.get(post.id);

      return {
        ...post,
        UserMedia: post.watermark_enabled
          ? await GenerateBatchSignedUrls(
              (post.UserMedia || []).map((media) => ({
                media_id: media.media_id,
                media_type: media.media_type,
                url: media.url,
                poster: media.poster,
                blur: media.blur,
              }))
            )
          : post.UserMedia,
        likedByme: likeInfo.isLiked,
        post_likes: likeInfo.count, // Update with Redis count
        wasReposted: !!isReposted,
        isSubscribed:
          authUserid === post.user.id ||
          checkIfUserCanViewPaidPosts ||
          !!isSubscribed,
      };
    });

    const resolvedPosts = await Promise.all(postsChecked);

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(resolvedPosts), "EX", 1800); // Cache for 30 minutes to match signed URLs
    return resolvedPosts;
  }
  private static async searchInUsers(
    searchQuery: string,
    authUserId: number
  ): Promise<any> {
    const results = await query.user.findMany({
      where: {
        OR: [
          { username: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
          { location: { contains: searchQuery, mode: "insensitive" } },
          { bio: { contains: searchQuery, mode: "insensitive" } },
          { country: { contains: searchQuery, mode: "insensitive" } },
        ],
        AND: {
          BlockedByUsers: {
            none: {
              blocked_id: authUserId,
            },
          },
        },
        NOT: [
          {
            active_status: false,
          },
          {
            flags: {
              array_contains: Permissions.PROFILE_HIDDEN,
            },
          },
        ],
      },
      select: {
        id: true,
        email: true,
        name: true,
        user_id: true,
        username: true,
        profile_image: true,
        profile_banner: true,
        bio: true,
        location: true,
        state: true,
        country: true,
        is_model: true,
        admin: true,
        total_followers: true,
        total_subscribers: true,
        total_following: true,
        created_at: true,
      },
    });

    if (results.length === 0) {
      return [];
    }

    const usersWithFollowing = await Promise.all(
      results.map(async (result) => {
        const following = await query.follow.findFirst({
          where: {
            user_id: result.id,
            follower_id: authUserId,
          },
        });
        return {
          ...result,
          following: !!following,
        };
      })
    );

    // Cache the results
    // await redis.set(cacheKey, JSON.stringify(usersWithFollowing), "EX", 5); // Cache for 5 seconds
    return usersWithFollowing;
  }
  private static async searchInMedia(
    searchQuery: string,
    authUserId: number
  ): Promise<any> {
    const cacheKey = `search:media:${searchQuery}:${authUserId}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const user = await query.user.findUnique({
      where: {
        id: authUserId,
      },
    });

    const checkIfUserCanViewPaidPosts = RBAC.checkUserFlag(
      user?.flags,
      Permissions.VIEW_PAID_POSTS
    );

    const results = await query.userMedia.findMany({
      where: {
        OR: [
          {
            post: {
              content: {
                contains: searchQuery,
                mode: "insensitive",
              },
            },
          },
          { media_id: { contains: searchQuery, mode: "insensitive" } },
        ],
        post: {
          post_audience: "public",
        },
        accessible_to: "public",
      },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            created_at: true,
            user_id: true,
            post_id: true,
            post_price: true,
            post_audience: true,
            watermark_enabled: true,
            user: {
              select: {
                id: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            user_id: true,
            username: true,
            name: true,
            profile_image: true,
          },
        },
      },
    });

    if (results.length === 0) {
      return [];
    }

    // Get post IDs for checking subscriptions and payments
    const postIds = results.map((media) => media.post_id);
    const userIds = results.map((media) => media.post.user.id);

    // Batch fetch subscriptions and purchased posts
    const [subscriptions, purchasedPosts] = await Promise.all([
      query.subscribers.findMany({
        where: {
          user_id: { in: userIds },
          subscriber_id: authUserId,
          status: "active",
        },
      }),
      query.purchasedPosts.findMany({
        where: {
          post_id: { in: postIds },
          user_id: authUserId,
        },
      }),
    ]);

    const subscriptionMap = new Map(subscriptions.map((s) => [s.user_id, s]));
    const purchasedPostsMap = new Map(
      purchasedPosts.map((p) => [p.post_id, p])
    );

    // Process media with conditional signed URLs and access checks
    const processedResults = await Promise.all(
      results.map(async (media) => {
        const isSubscribed =
          checkIfUserCanViewPaidPosts ||
          media.post.user.id === authUserId ||
          !!subscriptionMap.get(media.post.user.id);

        const hasPaid =
          checkIfUserCanViewPaidPosts ||
          !!purchasedPostsMap.get(media.post_id) ||
          media.accessible_to !== "price";

        if (media.post?.watermark_enabled) {
          const signedMedia = await GenerateBatchSignedUrls([
            {
              media_id: media.media_id,
              media_type: media.media_type,
              url: media.url,
              poster: media.poster,
              blur: media.blur,
            },
          ]);
          return {
            ...media,
            ...signedMedia[0],
            isSubscribed,
            hasPaid,
          };
        }
        return {
          ...media,
          isSubscribed,
          hasPaid,
        };
      })
    );

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(processedResults), "EX", 1800); // Cache for 30 minutes to match signed URLs
    return processedResults;
  }

  static async SearchPlatform(
    query: string,
    category: string,
    authUser: AuthUser
  ): Promise<SearchPlatformResponse> {
    try {
      let results: any;
      if (category === "posts") {
        results = await this.searchInPosts(query, authUser.id);
      } else if (category === "users") {
        results = await this.searchInUsers(query, authUser.id);
      } else if (category === "media") {
        results = await this.searchInMedia(query, authUser.id);
      } else {
        results = { message: "Invalid category" + category, error: true };
      }

      if (!results) {
        return { message: "No results found", error: true };
      }

      return {
        message: "Search results retrieved successfully",
        results: results,
        error: false,
      };
    } catch (error) {
      console.error("Error in SearchService.SearchPlatform:", error);
      throw new Error("Internal Server Error");
    }
  }
}
