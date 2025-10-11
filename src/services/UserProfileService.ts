import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";

/**
 * UserProfileService - Tracks and analyzes user behavior to build preference profiles
 * This service creates a comprehensive user profile based on their interactions
 */
export class UserProfileService {
  private static readonly USER_PROFILE_PREFIX = "user:profile:";
  private static readonly USER_INTERACTIONS_PREFIX = "user:interactions:";
  private static readonly USER_CREATORS_AFFINITY_PREFIX =
    "user:creators:affinity:";
  private static readonly PROFILE_TTL = 86400; // 24 hours
  private static readonly MAX_INTERACTIONS_TRACKED = 1000;

  /**
   * Track user interaction with a post
   * Interactions include: view, like, comment, repost, purchase
   */
  static async trackInteraction(
    userId: number,
    postId: number,
    creatorId: number,
    interactionType: "view" | "like" | "comment" | "repost" | "purchase"
  ): Promise<void> {
    try {
      const timestamp = Date.now();
      const interactionKey = `${this.USER_INTERACTIONS_PREFIX}${userId}`;
      const creatorAffinityKey = `${this.USER_CREATORS_AFFINITY_PREFIX}${userId}`;

      const pipeline = redis.pipeline();

      // Store interaction with timestamp (sorted set for recency)
      const interactionData = JSON.stringify({
        postId,
        creatorId,
        type: interactionType,
        timestamp,
      });

      // Add to user's interaction history (limited to last N interactions)
      pipeline.zadd(interactionKey, timestamp, interactionData);
      pipeline.zremrangebyrank(
        interactionKey,
        0,
        -(this.MAX_INTERACTIONS_TRACKED + 1)
      );
      pipeline.expire(interactionKey, this.PROFILE_TTL);

      // Update creator affinity score
      // Different interaction types have different weights
      const weights = {
        view: 1,
        like: 3,
        comment: 5,
        repost: 7,
        purchase: 10,
      };

      pipeline.zincrby(
        creatorAffinityKey,
        weights[interactionType],
        creatorId.toString()
      );
      pipeline.expire(creatorAffinityKey, this.PROFILE_TTL);

      await pipeline.exec();
    } catch (error) {
      console.error("Error tracking interaction:", error);
    }
  }

  /**
   * Get user's top creators (by affinity score)
   */
  static async getTopCreators(
    userId: number,
    limit = 50
  ): Promise<Array<{ creatorId: number; score: number }>> {
    try {
      const key = `${this.USER_CREATORS_AFFINITY_PREFIX}${userId}`;
      const creators = await redis.zrevrange(key, 0, limit - 1, "WITHSCORES");

      const result: Array<{ creatorId: number; score: number }> = [];
      for (let i = 0; i < creators.length; i += 2) {
        result.push({
          creatorId: parseInt(creators[i], 10),
          score: parseFloat(creators[i + 1]),
        });
      }

      return result;
    } catch (error) {
      console.error("Error getting top creators:", error);
      return [];
    }
  }

  /**
   * Get user's recent interactions
   */
  static async getRecentInteractions(
    userId: number,
    limit = 100
  ): Promise<
    Array<{
      postId: number;
      creatorId: number;
      type: string;
      timestamp: number;
    }>
  > {
    try {
      const key = `${this.USER_INTERACTIONS_PREFIX}${userId}`;
      const interactions = await redis.zrevrange(key, 0, limit - 1);

      return interactions.map((data) => JSON.parse(data));
    } catch (error) {
      console.error("Error getting recent interactions:", error);
      return [];
    }
  }

  /**
   * Build comprehensive user profile from database and cache
   */
  static async buildUserProfile(userId: number): Promise<{
    followedCreators: number[];
    subscribedCreators: number[];
    topAffinityCreators: Array<{ creatorId: number; score: number }>;
    recentInteractions: Array<{
      postId: number;
      creatorId: number;
      type: string;
      timestamp: number;
    }>;
    interactionStats: {
      totalLikes: number;
      totalComments: number;
      totalReposts: number;
      totalPurchases: number;
    };
  }> {
    try {
      const profileKey = `${this.USER_PROFILE_PREFIX}${userId}`;

      // Check if profile exists in cache
      const cachedProfile = await redis.get(profileKey);
      if (cachedProfile) {
        return JSON.parse(cachedProfile);
      }

      // Build profile from database and Redis
      const [follows, subscriptions, topCreators, recentInteractions, stats] =
        await Promise.all([
          // Get followed creators
          query.follow.findMany({
            where: { follower_id: userId },
            select: { user_id: true },
          }),

          // Get subscribed creators
          query.subscribers.findMany({
            where: { subscriber_id: userId },
            select: { user_id: true },
          }),

          // Get top affinity creators from Redis
          this.getTopCreators(userId, 50),

          // Get recent interactions from Redis
          this.getRecentInteractions(userId, 100),

          // Get interaction stats from database
          query.$transaction([
            query.postLike.count({ where: { user_id: userId } }),
            query.postComment.count({ where: { user_id: userId } }),
            query.userRepost.count({ where: { user_id: userId } }),
            query.purchasedPosts.count({ where: { user_id: userId } }),
          ]),
        ]);

      const profile = {
        followedCreators: follows.map((f) => f.user_id),
        subscribedCreators: subscriptions.map((s) => s.user_id),
        topAffinityCreators: topCreators,
        recentInteractions,
        interactionStats: {
          totalLikes: stats[0],
          totalComments: stats[1],
          totalReposts: stats[2],
          totalPurchases: stats[3],
        },
      };

      // Cache the profile
      await redis.setex(profileKey, this.PROFILE_TTL, JSON.stringify(profile));

      return profile;
    } catch (error) {
      console.error("Error building user profile:", error);
      return {
        followedCreators: [],
        subscribedCreators: [],
        topAffinityCreators: [],
        recentInteractions: [],
        interactionStats: {
          totalLikes: 0,
          totalComments: 0,
          totalReposts: 0,
          totalPurchases: 0,
        },
      };
    }
  }

  /**
   * Invalidate user profile cache (call when significant changes occur)
   */
  static async invalidateProfile(userId: number): Promise<void> {
    try {
      const profileKey = `${this.USER_PROFILE_PREFIX}${userId}`;
      await redis.del(profileKey);
    } catch (error) {
      console.error("Error invalidating profile:", error);
    }
  }

  /**
   * Get user's preferred content characteristics based on interaction patterns
   */
  static async getContentPreferences(userId: number): Promise<{
    preferredCreatorTypes: string[]; // 'model' or 'regular'
    engagementPatterns: {
      likesFrequency: "high" | "medium" | "low";
      commentsFrequency: "high" | "medium" | "low";
      purchaseWillingness: "high" | "medium" | "low";
    };
  }> {
    try {
      const profile = await this.buildUserProfile(userId);

      // Analyze creator types from top affinity creators
      const topCreatorIds = profile.topAffinityCreators
        .slice(0, 20)
        .map((c) => c.creatorId);

      const creators = await query.user.findMany({
        where: { id: { in: topCreatorIds } },
        select: { is_model: true },
      });

      const modelCount = creators.filter((c) => c.is_model).length;
      const preferredCreatorTypes =
        modelCount > creators.length / 2
          ? ["model", "regular"]
          : ["regular", "model"];

      // Analyze engagement patterns
      const { totalLikes, totalComments, totalPurchases } =
        profile.interactionStats;

      const getLevelFromCount = (count: number): "high" | "medium" | "low" => {
        if (count > 100) return "high";
        if (count > 20) return "medium";
        return "low";
      };

      return {
        preferredCreatorTypes,
        engagementPatterns: {
          likesFrequency: getLevelFromCount(totalLikes),
          commentsFrequency: getLevelFromCount(totalComments),
          purchaseWillingness: getLevelFromCount(totalPurchases),
        },
      };
    } catch (error) {
      console.error("Error getting content preferences:", error);
      return {
        preferredCreatorTypes: ["model", "regular"],
        engagementPatterns: {
          likesFrequency: "low",
          commentsFrequency: "low",
          purchaseWillingness: "low",
        },
      };
    }
  }
}
