import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import { UserProfileService } from "./UserProfileService";
import { RecommendedFeed } from "@utils/mongoSchema";
import type { Post } from "@prisma/client";

/**
 * RecommendationService - Pre-computes and caches personalized feed recommendations
 * Uses Redis for fast access and MongoDB for persistence
 * This significantly reduces compute time on first render
 */
export class RecommendationService {
  private static readonly FEED_CACHE_PREFIX = "feed:recommendations:";
  private static readonly FEED_CACHE_TTL = 3600; // 1 hour
  private static readonly MONGO_TTL = 86400; // 24 hours in MongoDB
  private static readonly CANDIDATE_POOL_SIZE = 200; // Fetch more candidates for better selection
  private static readonly RECOMMENDATION_SIZE = 50; // Number of posts to recommend

  /**
   * Get recommended feed for user (cached or freshly computed)
   * Tries Redis first, then MongoDB, then computes fresh
   */
  static async getRecommendedFeed(
    userId: number,
    limit = 10
  ): Promise<number[]> {
    try {
      const cacheKey = `${this.FEED_CACHE_PREFIX}${userId}`;

      // 1. Try Redis first (fastest)
      const cached = await redis.get(cacheKey);
      if (cached) {
        console.log(`✅ Redis cache HIT for user ${userId}`);
        const postIds = JSON.parse(cached) as number[];
        return postIds.slice(0, limit);
      }

      console.log(
        `⚠️ Redis cache MISS for user ${userId}, checking MongoDB...`
      );

      // 2. Try MongoDB (persistent backup)
      const mongoFeed = await RecommendedFeed.findOne({
        userId,
        expiresAt: { $gt: new Date() },
      })
        .sort({ computedAt: -1 })
        .lean();

      if (mongoFeed && mongoFeed.postIds.length > 0) {
        console.log(`✅ MongoDB cache HIT for user ${userId}`);

        // Restore to Redis for future fast access
        await redis.setex(
          cacheKey,
          this.FEED_CACHE_TTL,
          JSON.stringify(mongoFeed.postIds)
        );

        return mongoFeed.postIds.slice(0, limit);
      }

      console.log(
        `⚠️ MongoDB cache MISS for user ${userId}, computing fresh...`
      );

      // 3. Cache miss - compute fresh recommendations
      const startTime = Date.now();
      const { recommendations, metadata } = await this.computeRecommendations(
        userId
      );
      const computeTime = Date.now() - startTime;

      console.log(
        `✅ Computed recommendations for user ${userId} in ${computeTime}ms`
      );

      // 4. Save to both Redis AND MongoDB
      await Promise.all([
        // Save to Redis (fast, temporary)
        redis.setex(
          cacheKey,
          this.FEED_CACHE_TTL,
          JSON.stringify(recommendations)
        ),

        // Save to MongoDB (persistent, backup)
        RecommendedFeed.create({
          userId,
          postIds: recommendations,
          scores: metadata.scores,
          computedAt: new Date(),
          expiresAt: new Date(Date.now() + this.MONGO_TTL * 1000),
          algorithm: "v1",
          metadata: {
            candidateCount: metadata.candidateCount,
            computeTimeMs: computeTime,
            sourceBreakdown: metadata.sourceBreakdown,
          },
        }),
      ]);

      return recommendations.slice(0, limit);
    } catch (error) {
      console.error("Error getting recommended feed:", error);
      return [];
    }
  }

  /**
   * Compute personalized recommendations based on user profile
   * Returns recommendations and metadata for MongoDB storage
   */
  private static async computeRecommendations(userId: number): Promise<{
    recommendations: number[];
    metadata: {
      scores: number[];
      candidateCount: number;
      sourceBreakdown: {
        preferredCreators: number;
        trending: number;
        discovery: number;
      };
    };
  }> {
    try {
      // Build user profile
      const profile = await UserProfileService.buildUserProfile(userId);
      const preferences = await UserProfileService.getContentPreferences(
        userId
      );

      // Get candidate posts with source tracking
      const { candidates, sourceBreakdown } = await this.getCandidatePosts(
        userId,
        profile
      );

      if (candidates.length === 0) {
        return {
          recommendations: [],
          metadata: {
            scores: [],
            candidateCount: 0,
            sourceBreakdown: {
              preferredCreators: 0,
              trending: 0,
              discovery: 0,
            },
          },
        };
      }

      
      const postIds = candidates.map((p) => p.id);
      const userLikes = await query.postLike.findMany({
        where: {
          user_id: userId,
          post_id: { in: postIds },
        },
        select: { post_id: true },
      });
      const likedPostIds = new Set(userLikes.map((l) => l.post_id));

      // Score and rank candidates
      const scored = candidates.map((post) => ({
        postId: post.id,
        score: this.calculateRecommendationScore(
          post,
          profile,
          preferences,
          likedPostIds 
        ),
      }));

      // Sort by score and return top N
      scored.sort((a, b) => b.score - a.score);

      const topScored = scored.slice(0, this.RECOMMENDATION_SIZE);

      return {
        recommendations: topScored.map((s) => s.postId),
        metadata: {
          scores: topScored.map((s) => s.score),
          candidateCount: candidates.length,
          sourceBreakdown,
        },
      };
    } catch (error) {
      console.error("Error computing recommendations:", error);
      return {
        recommendations: [],
        metadata: {
          scores: [],
          candidateCount: 0,
          sourceBreakdown: {
            preferredCreators: 0,
            trending: 0,
            discovery: 0,
          },
        },
      };
    }
  }

  /**
   * Get candidate posts for recommendation
   * Mix of: followed creators, subscribed creators, high affinity creators, and trending posts
   * Returns candidates and source breakdown for analytics
   */
  private static async getCandidatePosts(
    userId: number,
    profile: Awaited<ReturnType<typeof UserProfileService.buildUserProfile>>
  ): Promise<{
    candidates: Array<
      Post & { user: { is_model: boolean; total_followers: number } }
    >;
    sourceBreakdown: {
      preferredCreators: number;
      trending: number;
      discovery: number;
    };
  }> {
    try {
      // Get blockers
      const blockedByUsers = await query.userBlock.findMany({
        where: { blocked_id: userId },
        select: { blocker_id: true },
      });
      const blockedByUserIds = blockedByUsers.map((b) => b.blocker_id);

      // Get IDs of recently interacted posts (to avoid showing again)
      const recentPostIds = profile.recentInteractions
        .slice(0, 50)
        .map((i) => i.postId);

      // Build list of preferred creators
      const preferredCreatorIds = new Set([
        ...profile.followedCreators,
        ...profile.subscribedCreators,
        ...profile.topAffinityCreators.slice(0, 30).map((c) => c.creatorId),
      ]);

      
      const userIdsForReposts = new Set([
        ...Array.from(preferredCreatorIds),
        userId,
      ]);

      // Fetch candidates from multiple sources
      const [creatorPosts, trendingPosts, diversePosts, repostedPosts] =
        await Promise.all([
          // 1. Posts from preferred creators (60% of candidates)
          preferredCreatorIds.size > 0
            ? query.post.findMany({
                where: {
                  user_id: {
                    in: Array.from(preferredCreatorIds),
                    notIn: blockedByUserIds,
                  },
                  post_is_visible: true,
                  post_status: "approved",
                  id: { notIn: recentPostIds },
                  user: { active_status: true },
                  OR: [
                    { post_audience: "public" },
                    { post_audience: "followers" },
                    { post_audience: "subscribers" },
                    { post_audience: "price" },
                    { user_id: userId },
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
                  post_reposts: true,
                  user_id: true,
                  user: {
                    select: {
                      is_model: true,
                      total_followers: true,
                    },
                  },
                },
                take: Math.floor(this.CANDIDATE_POOL_SIZE * 0.6),
                orderBy: { created_at: "desc" },
              })
            : [],

          // 2. Trending posts (high engagement) (25% of candidates)
          query.post.findMany({
            where: {
              post_is_visible: true,
              post_status: "approved",
              id: { notIn: recentPostIds },
              user: { active_status: true },
              user_id: { notIn: blockedByUserIds },
              created_at: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
              OR: [
                { post_audience: "public" },
                { post_audience: "followers" },
                { post_audience: "subscribers" },
                { post_audience: "price" },
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
              post_reposts: true,
              user_id: true,
              user: {
                select: {
                  is_model: true,
                  total_followers: true,
                },
              },
            },
            take: Math.floor(this.CANDIDATE_POOL_SIZE * 0.25),
            orderBy: [
              { post_likes: "desc" },
              { post_comments: "desc" },
              { created_at: "desc" },
            ],
          }),

          // 3. Diverse posts (discovery) (15% of candidates)
          query.post.findMany({
            where: {
              post_is_visible: true,
              post_status: "approved",
              id: { notIn: recentPostIds },
              user: { active_status: true },
              user_id: { notIn: blockedByUserIds },
              created_at: {
                gte: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // Last 3 days
              },
              OR: [
                { post_audience: "public" },
                { post_audience: "followers" },
                { post_audience: "subscribers" },
                { post_audience: "price" },
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
              post_reposts: true,
              user_id: true,
              user: {
                select: {
                  is_model: true,
                  total_followers: true,
                },
              },
            },
            take: Math.floor(this.CANDIDATE_POOL_SIZE * 0.15),
            orderBy: { created_at: "desc" },
          }),

          // 4. Reposts from followed/subscribed creators (10% of candidates)
          userIdsForReposts.size > 0
            ? query.userRepost
                .findMany({
                  where: {
                    user_id: {
                      in: Array.from(userIdsForReposts), 
                      notIn: blockedByUserIds,
                    },
                    created_at: {
                      gte: new Date(Date.now() - 24 * 60 * 60 * 1000), 
                    },
                  },
                  select: {
                    created_at: true, 
                    user_id: true, 
                    post: {
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
                        post_reposts: true,
                        user_id: true,
                        post_is_visible: true,
                        user: {
                          select: {
                            is_model: true,
                            total_followers: true,
                          },
                        },
                      },
                    },
                  },
                  take: Math.floor(this.CANDIDATE_POOL_SIZE * 0.1),
                  orderBy: { created_at: "desc" }, 
                })
                .then((reposts) =>
                  reposts
                    .map((r) => ({
                      ...r.post,
                      repost_created_at: r.created_at, 
                      repost_by_user: r.user_id === userId, 
                    }))
                    .filter(
                      (post) =>
                        post.post_is_visible &&
                        post.post_status === "approved" &&
                        !recentPostIds.includes(post.id) &&
                        !blockedByUserIds.includes(post.user_id)
                    )
                )
            : Promise.resolve([]),
        ]);

      // Combine and deduplicate
      const allCandidates = [
        ...creatorPosts,
        ...trendingPosts,
        ...diversePosts,
        ...repostedPosts,
      ];
      const uniquePosts = new Map();

      for (const post of allCandidates) {
        if (!uniquePosts.has(post.id)) {
          uniquePosts.set(post.id, post);
        }
      }

      const finalCandidates = Array.from(uniquePosts.values());

      return {
        candidates: finalCandidates,
        sourceBreakdown: {
          preferredCreators: creatorPosts.length,
          trending: trendingPosts.length,
          discovery: diversePosts.length + repostedPosts.length,
        },
      };
    } catch (error) {
      console.error("Error getting candidate posts:", error);
      return {
        candidates: [],
        sourceBreakdown: {
          preferredCreators: 0,
          trending: 0,
          discovery: 0,
        },
      };
    }
  }

  /**
   * Calculate recommendation score for a post
   * Higher scores = better match for user
   */
  private static calculateRecommendationScore(
    post: Post & { user: { is_model: boolean; total_followers: number } },
    profile: Awaited<ReturnType<typeof UserProfileService.buildUserProfile>>,
    preferences: Awaited<
      ReturnType<typeof UserProfileService.getContentPreferences>
    >,
    userLikedPostIds: Set<number> 
  ): number {
    let score = 0;

    // 1. Creator affinity (40%)
    const creatorAffinity = profile.topAffinityCreators.find(
      (c) => c.creatorId === post.user_id
    );
    if (creatorAffinity) {
      score += creatorAffinity.score * 0.4;
    }

    // 2. Relationship bonus (30%)
    if (profile.subscribedCreators.includes(post.user_id)) {
      score += 30; // High priority for subscribed creators
    } else if (profile.followedCreators.includes(post.user_id)) {
      score += 20; // Medium priority for followed creators
    }

    // 3. Engagement quality (20%)
    const totalEngagement =
      post.post_likes * 1 + post.post_comments * 2 + post.post_reposts * 3;
    const normalizedEngagement = Math.log1p(totalEngagement);
    score += normalizedEngagement * 0.2;

    // 4. Recency (25% - INCREASED to prioritize new posts)
    const ageInHours =
      (Date.now() - post.created_at.getTime()) / (1000 * 60 * 60);
    const recencyScore = Math.exp(-0.1 * ageInHours); 
    score += recencyScore * 25; 

    
    if (ageInHours < 6) {
      const newPostBonus = Math.exp(-0.4 * ageInHours) * 40;
      score += newPostBonus;
    }

    // 5. Content type preference bonus (10%)
    if (
      preferences.preferredCreatorTypes[0] === "model" &&
      post.user.is_model
    ) {
      score += 10;
    } else if (
      preferences.preferredCreatorTypes[0] === "regular" &&
      !post.user.is_model
    ) {
      score += 10;
    }

    // 6. Creator popularity factor (5%)
    const followerScore = Math.log1p(post.user.total_followers) * 0.5;
    score += followerScore;

    // 7. MASSIVE repost recency boost (prioritize fresh reposts)
    if ((post as any).repost_created_at) {
      const repostAgeInHours =
        (Date.now() - new Date((post as any).repost_created_at).getTime()) /
        (1000 * 60 * 60);

      // Base repost recency boost (aggressive exponential decay)
      const repostRecencyBoost = Math.exp(-0.25 * repostAgeInHours) * 60;
      score += repostRecencyBoost;

      
      // This means someone reposted content the user already engaged with
      if (userLikedPostIds.has(post.id)) {
        score += 50; // Massive boost - user liked this, now someone they follow reposted it
      }

      
      // More likes = content user is more likely to engage with
      const likeBoost = Math.log1p(post.post_likes) * 2;
      score += likeBoost;

      
      const engagementRate =
        totalEngagement / Math.max(post.post_impressions || 1, 1);
      score += engagementRate * 10;

      // Huge boost for user's own reposts
      if ((post as any).repost_by_user) {
        score += 30; 
      }
    }

    return score;
  }
  /**
   * Pre-compute recommendations for a user (for background jobs)
   * Saves to both Redis and MongoDB
   */
  static async preComputeFeed(userId: number): Promise<boolean> {
    try {
      const startTime = Date.now();
      const { recommendations, metadata } = await this.computeRecommendations(
        userId
      );
      const computeTime = Date.now() - startTime;

      const cacheKey = `${this.FEED_CACHE_PREFIX}${userId}`;

      // Save to both Redis and MongoDB in parallel
      await Promise.all([
        redis.setex(
          cacheKey,
          this.FEED_CACHE_TTL,
          JSON.stringify(recommendations)
        ),
        RecommendedFeed.create({
          userId,
          postIds: recommendations,
          scores: metadata.scores,
          computedAt: new Date(),
          expiresAt: new Date(Date.now() + this.MONGO_TTL * 1000),
          algorithm: "v1",
          metadata: {
            candidateCount: metadata.candidateCount,
            computeTimeMs: computeTime,
            sourceBreakdown: metadata.sourceBreakdown,
          },
        }),
      ]);

      console.log(
        `✅ Pre-computed feed for user ${userId}: ${recommendations.length} posts in ${computeTime}ms`
      );

      return true;
    } catch (error) {
      console.error(`Error pre-computing feed for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Invalidate recommendation cache (call when user makes significant actions)
   * Clears both Redis and MongoDB caches
   */
  static async invalidateRecommendations(userId: number): Promise<void> {
    try {
      const cacheKey = `${this.FEED_CACHE_PREFIX}${userId}`;

      // Clear both Redis and MongoDB in parallel
      await Promise.all([
        redis.del(cacheKey),
        RecommendedFeed.deleteMany({ userId }),
        // Also invalidate profile since it affects recommendations
        UserProfileService.invalidateProfile(userId),
      ]);

      console.log(`🗑️ Invalidated recommendations for user ${userId}`);
    } catch (error) {
      console.error("Error invalidating recommendations:", error);
    }
  }

  /**
   * Check if user has cached recommendations (checks both Redis and MongoDB)
   */
  static async hasCachedRecommendations(userId: number): Promise<boolean> {
    try {
      const cacheKey = `${this.FEED_CACHE_PREFIX}${userId}`;

      // Check Redis first (fastest)
      const redisExists = await redis.exists(cacheKey);
      if (redisExists === 1) {
        return true;
      }

      // Check MongoDB as fallback
      const mongoExists = await RecommendedFeed.exists({
        userId,
        expiresAt: { $gt: new Date() },
      });

      return !!mongoExists;
    } catch (error) {
      console.error("Error checking cached recommendations:", error);
      return false;
    }
  }

  /**
   * Get recommendation statistics for a user (from MongoDB)
   */
  static async getRecommendationStats(userId: number): Promise<{
    totalComputed: number;
    lastComputed: Date | null;
    avgComputeTime: number;
    avgCandidates: number;
  }> {
    try {
      const feeds = await RecommendedFeed.find({ userId })
        .sort({ computedAt: -1 })
        .limit(10)
        .lean();

      if (feeds.length === 0) {
        return {
          totalComputed: 0,
          lastComputed: null,
          avgComputeTime: 0,
          avgCandidates: 0,
        };
      }

      const avgComputeTime =
        feeds.reduce((sum, f) => sum + (f.metadata?.computeTimeMs || 0), 0) /
        feeds.length;
      const avgCandidates =
        feeds.reduce((sum, f) => sum + (f.metadata?.candidateCount || 0), 0) /
        feeds.length;

      return {
        totalComputed: feeds.length,
        lastComputed: feeds[0].computedAt,
        avgComputeTime: Math.round(avgComputeTime),
        avgCandidates: Math.round(avgCandidates),
      };
    } catch (error) {
      console.error("Error getting recommendation stats:", error);
      return {
        totalComputed: 0,
        lastComputed: null,
        avgComputeTime: 0,
        avgCandidates: 0,
      };
    }
  }

  /**
   * Cleanup old recommendations from MongoDB (run periodically)
   */
  static async cleanupExpiredRecommendations(): Promise<number> {
    try {
      const result = await RecommendedFeed.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      console.log(
        `🧹 Cleaned up ${result.deletedCount} expired recommendations`
      );
      return result.deletedCount || 0;
    } catch (error) {
      console.error("Error cleaning up recommendations:", error);
      return 0;
    }
  }
}
