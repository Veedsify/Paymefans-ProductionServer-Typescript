import { redis } from "@libs/RedisStore";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import query from "@utils/prisma";
import { SearchPlatformResponse } from "types/search";
import { AuthUser } from "types/user";

export default class SearchService {
  private static async searchInPosts(
    searchQuery: string,
    authUserid: number,
  ): Promise<any> {
    const cacheKey = `search:posts:${query}`;
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
      Permissions.VIEW_PAID_POSTS,
    );

    const results = await query.post.findMany({
      where: {
        OR: [
          { content: { contains: searchQuery, mode: "insensitive" } },
          { post_id: { contains: searchQuery, mode: "insensitive" } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            user_id: true,
            username: true,
            name: true,
            fullname: true,
            profile_image: true,
          },
        },
        UserMedia: true,
      },
    });

    if (results.length === 0) {
      return [];
    }

    const postsChecked = results.map(async (post) => {
      const postLike = await query.postLike.findFirst({
        where: {
          user_id: post.user.id,
          post_id: post.id,
        },
      });

      const isSubscribed = await query.subscribers.findFirst({
        where: {
          user_id: post.user.id,
          subscriber_id: authUserid,
        },
      });

      const isReposted = await query.userRepost.findFirst({
        where: {
          user_id: authUserid,
          post_id: post.id,
        },
      });

      return {
        ...post,
        likedByme: postLike ? true : false,
        wasReposted: !!isReposted,
        isSubscribed:
          authUserid === post.user.id ||
          checkIfUserCanViewPaidPosts ||
          !!isSubscribed,
      };
    });

    const resolvedPosts = await Promise.all(postsChecked);

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(resolvedPosts), "EX", 30); // Cache for 30 seconds
    return resolvedPosts;
  }
  private static async searchInUsers(searchQuery: string): Promise<any> {
    const cacheKey = `search:users:${searchQuery}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

    const results = await query.user.findMany({
      where: {
        OR: [
          { username: { contains: searchQuery, mode: "insensitive" } },
          { name: { contains: searchQuery, mode: "insensitive" } },
          { fullname: { contains: searchQuery, mode: "insensitive" } },
          { location: { contains: searchQuery, mode: "insensitive" } },
          { bio: { contains: searchQuery, mode: "insensitive" } },
          { country: { contains: searchQuery, mode: "insensitive" } },
        ],
        NOT: {
          flags: {
            array_contains: Permissions.PROFILE_HIDDEN
          }
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        fullname: true,
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

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(results), "EX", 30); // Cache for 30 seconds
    return results;
  }
  private static async searchInMedia(searchQuery: string): Promise<any> {
    const cacheKey = `search:media:${searchQuery}`;
    const cachedResult = await redis.get(cacheKey);
    if (cachedResult) {
      return JSON.parse(cachedResult);
    }

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
            fullname: true,
            profile_image: true,
          },
        },
      },
    });

    if (results.length === 0) {
      return [];
    }

    // Cache the results
    await redis.set(cacheKey, JSON.stringify(results), "EX", 30); // Cache for 30 seconds
    return results;
  }

  static async SearchPlatform(
    query: string,
    category: string,
    authUser: AuthUser,
  ): Promise<SearchPlatformResponse> {
    try {
      let results: any;
      if (category === "posts") {
        results = await this.searchInPosts(query, authUser.id);
      } else if (category === "users") {
        results = await this.searchInUsers(query);
      } else if (category === "media") {
        results = await this.searchInMedia(query);
      } else {
        results = { message: "Invalid category" + category, error: true };
      }

      if (!results) {
        return { message: "No results found", error: true };
      }

      // Cache the results
      const cacheKey = `search:${category}:${query}`;
      await redis.set(cacheKey, JSON.stringify(results), "EX", 60); //
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
