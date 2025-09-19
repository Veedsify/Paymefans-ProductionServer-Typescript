import type { Post } from "@prisma/client";
import query from "@utils/prisma";
import type { PostWithLike } from "../types/feed";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import { GenerateBatchSignedUrls } from "@libs/GenerateSignedUrls";
import { RedisPostService } from "./RedisPostService";

class FeedService {
  private static readonly POSTS_PER_HOME_PAGE =
    Number(process.env.POSTS_PER_HOME_PAGE) || 10;
  private static readonly FETCH_WINDOW_MULTIPLIER = 5; // Fetch 5x to account for re-ranking
  private static readonly ENGAGEMENT_WEIGHT = 0.4;
  private static readonly RECENCY_WEIGHT = 0.3;
  private static readonly RELEVANCE_WEIGHT = 0.3;
  private static readonly TIME_DECAY_FACTOR = 0.1;

  private calculateEngagementScore(post: Post): number {
    const totalInteractions =
      post.post_likes + post.post_comments + post.post_reposts;
    return (
      (post.post_likes * 1 + post.post_comments * 1.5 + post.post_reposts * 2) /
      (totalInteractions || 1)
    );
  }

  private calculateRecencyScore(postDate: Date): number {
    const ageInHours = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
    return Math.exp(-FeedService.TIME_DECAY_FACTOR * ageInHours);
  }

  private calculateRelevanceScore(
    post: Post,
    userId: number,
    followMap: Set<number>,
    subMap: Set<number>,
    interactionCountByCreator: Map<number, number>,
  ): number {
    let relevanceScore = 0;
    if (followMap.has(post.user_id)) relevanceScore += 0.3;
    if (subMap.has(post.user_id) || userId === post.user_id) relevanceScore += 0.5;

    const similarContentInteraction = interactionCountByCreator.get(post.user_id) || 0;
    relevanceScore += Math.min(similarContentInteraction * 0.1, 0.2);
    return Math.min(relevanceScore, 1);
  }

  public async getHomeFeed(
    authUserid: number,
    cursor?: string,
  ): Promise<{
    posts: Array<Post & { score: number; likedByme: boolean }>;
    nextCursor?: string;
    hasMore: boolean;
  }> {
    try {
      let cursorInfo: number | undefined;

      if (cursor) {
        try {
          cursorInfo = Number(cursor);
        } catch (error) {
          console.error("Invalid cursor:", error);
          throw new Error("Invalid cursor format");
        }
      }

      const blockedByUsers = await query.userBlock.findMany({
        where: { blocked_id: authUserid },
        select: { blocker_id: true },
      });

      const blockedByUserIds = blockedByUsers.map((b) => b.blocker_id);

      const whereClause: any = {
        post_is_visible: true,
        post_status: "approved",
        user: { active_status: true },
        user_id: { notIn: blockedByUserIds },
        OR: [
          { post_audience: "public" },
          { post_audience: "followers" },
          { post_audience: "subscribers" },
          { post_audience: "price" },
          { user_id: authUserid },
        ],
      };

      if (cursorInfo) {
        whereClause.id = { lt: cursorInfo };
      }

      const posts = await query.post.findMany({
        where: whereClause,
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
              name: true,
              user_id: true,
              username: true,
              profile_image: true,
              is_model: true,
              total_followers: true,
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
        take: FeedService.POSTS_PER_HOME_PAGE * FeedService.FETCH_WINDOW_MULTIPLIER + 1,
        orderBy: { id: "desc" },
      });

      const postIds = posts.map((p) => p.id);
      const postIdStrings = posts.map((p) => p.post_id); // Redis uses string post_id
      const userIds = [...new Set(posts.map((p) => p.user_id))];

      // Batch fetch related data
      const [likeData, reposts, subscriptions, paidPosts, follows, interactions] = await Promise.all([
        // Use Redis for like data
        RedisPostService.getMultiplePostsLikeData(postIdStrings, authUserid),
        query.userRepost.findMany({
          where: { post_id: { in: postIds }, user_id: authUserid },
        }),
        query.subscribers.findMany({
          where: { user_id: { in: userIds }, subscriber_id: authUserid },
        }),
        query.purchasedPosts.findMany({
          where: { post_id: { in: postIds }, user_id: authUserid },
        }),
        query.follow.findMany({
          where: { follower_id: authUserid, user_id: { in: userIds } },
          select: { user_id: true },
        }),
        query.postLike.findMany({
          where: { user_id: authUserid, post_id: { in: postIds } },
          select: { post: { select: { user_id: true } } },
        }),
      ]);

      const repostMap = new Map(reposts.map((r) => [r.post_id, r]));
      const subscriptionMap = new Map(subscriptions.map((s) => [s.user_id, s]));
      const paidMap = new Map(paidPosts.map((p) => [p.post_id, p]));

      // Build maps for relevance
      const followMap = new Set(follows.map((f) => f.user_id));
      const subMap = new Set(subscriptions.map((s) => s.user_id));
      const interactionCountByCreator = new Map<number, number>();
      for (const l of interactions) {
        const cid = l.post.user_id;
        interactionCountByCreator.set(cid, (interactionCountByCreator.get(cid) || 0) + 1);
      }

      const user = await query.user.findUnique({ where: { id: authUserid } });
      const hasViewPaidPermission = RBAC.checkUserFlag(
        user?.flags,
        Permissions.VIEW_PAID_POSTS,
      );

      const processedPostsWithoutMedia = posts.map((post) => {
        const isSubscribed =
          authUserid === post.user.id ||
          hasViewPaidPermission ||
          !!subscriptionMap.get(post.user_id);

        const hasPaid =
          !!paidMap.get(post.id) ||
          hasViewPaidPermission ||
          post.post_audience !== "price";

        // Get like data from Redis
        const likeInfo = likeData.get(post.post_id) || { count: post.post_likes, isLiked: false };
        const wasReposted = !!repostMap.get(post.id);

        return {
          ...post,
          likedByme: likeInfo.isLiked,
          post_likes: likeInfo.count,
          wasReposted,
          hasPaid,
          isSubscribed,
        };
      });

      // Collect all viewable media for batch signing
      const mediaToSign: Array<{ media_id: string; media_type: string; url: string; poster: string; blur: string; postId: number; media: any }> = [];
      processedPostsWithoutMedia.forEach(post => {
        if (post.watermark_enabled) {
          (post.UserMedia || []).forEach(media => {
            if (post.hasPaid || !media.locked) {
              mediaToSign.push({
                media_id: media.media_id,
                media_type: media.media_type,
                url: media.url,
                poster: media.poster,
                blur: media.blur,
                postId: post.id,
                media,
              });
            }
          });
        }
      });

      // Batch sign
      const signedMediaMap = new Map();
      if (mediaToSign.length > 0) {
        const signedResults = await GenerateBatchSignedUrls(mediaToSign);
        signedResults.forEach((signed, index) => {
          const original = mediaToSign[index];
          signedMediaMap.set(original.media.media_id, signed);
        });
      }

      // Attach signed media
      const processedPosts = processedPostsWithoutMedia.map(post => ({
        ...post,
        UserMedia: post.watermark_enabled
          ? (post.UserMedia || []).map(media => signedMediaMap.get(media.media_id) || media)
          : post.UserMedia,
      }));

      const scoredPosts = processedPosts.map((post) => {
        const engagementScore = this.calculateEngagementScore(post);
        const recencyScore = this.calculateRecencyScore(post.created_at);
        const relevanceScore = this.calculateRelevanceScore(
          post,
          authUserid,
          followMap,
          subMap,
          interactionCountByCreator,
        );

        const totalScore =
          engagementScore * FeedService.ENGAGEMENT_WEIGHT +
          recencyScore * FeedService.RECENCY_WEIGHT +
          relevanceScore * FeedService.RELEVANCE_WEIGHT;

        return { ...post, score: totalScore };
      });

      const sortedPosts = scoredPosts.sort((a, b) => b.score - a.score);
      const hasMore = posts.length > FeedService.POSTS_PER_HOME_PAGE * FeedService.FETCH_WINDOW_MULTIPLIER;
      const postsToReturn = sortedPosts.slice(0, FeedService.POSTS_PER_HOME_PAGE);

      let nextCursor: string | undefined;
      if (hasMore && postsToReturn.length > 0) {
        const minId = Math.min(...postsToReturn.map(p => p.id));
        nextCursor = minId.toString();
      }

      return {
        posts: postsToReturn,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error("Error in getHomeFeed:", error);
      throw new Error("Failed to fetch home feed");
    }
  }

  public async getUserPosts(
    viewerId: number,
    targetUserId: number,
    cursor?: string,
  ): Promise<{ posts: PostWithLike; nextCursor?: string; hasMore: boolean }> {
    try {
      let cursorInfo: number | undefined;

      if (cursor) {
        try {
          cursorInfo = Number(cursor);
        } catch (error) {
          console.error("Invalid cursor:", error);
          throw new Error("Invalid cursor format");
        }
      }

      // Check if the target user has blocked the viewer
      const isBlockedByTarget = await query.userBlock.findFirst({
        where: {
          blocker_id: targetUserId,
          blocked_id: viewerId,
        },
      });

      // If blocked, return empty result
      if (isBlockedByTarget) {
        return {
          posts: [],
          nextCursor: undefined,
          hasMore: false,
        };
      }

      const [isFollowing, isSubscribed] = await Promise.all([
        query.follow.findFirst({
          where: { user_id: targetUserId, follower_id: viewerId },
        }),
        query.subscribers.findFirst({
          where: { user_id: targetUserId, subscriber_id: viewerId },
        }),
      ]);

      const whereClause: any = {
        user_id: targetUserId,
        post_is_visible: true,
        OR: [
          { post_audience: "public" },
          {
            AND: [
              { post_audience: "followers" },
              { user_id: isFollowing ? targetUserId : -1 },
            ],
          },
          {
            AND: [
              { post_audience: "subscribers" },
              { user_id: isSubscribed ? targetUserId : -1 },
            ],
          },
        ],
      };

      // Add cursor conditions if cursor exists
      if (cursorInfo) {
        whereClause.id = { lt: cursorInfo };
      }

      const posts = await query.post.findMany({
        where: whereClause,
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
              name: true,
              user_id: true,
              username: true,
              profile_image: true,
              profile_banner: true,
              bio: true,
              total_followers: true,
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
          PostLike: true,
          UserRepost: true,
        },
        orderBy: { id: "desc" },
        take: FeedService.POSTS_PER_HOME_PAGE + 1,
      });

      const hasMore = posts.length > FeedService.POSTS_PER_HOME_PAGE;
      const postsToReturn = hasMore
        ? posts.slice(0, FeedService.POSTS_PER_HOME_PAGE)
        : posts;

      // Process UserMedia with conditional signed URLs
      const processedPosts = await Promise.all(
        postsToReturn.map(async (post) => ({
          ...post,
          UserMedia: post.watermark_enabled
            ? await GenerateBatchSignedUrls(
              (post.UserMedia || []).map(media => ({
                media_id: media.media_id,
                media_type: media.media_type,
                url: media.url,
                poster: media.poster,
                blur: media.blur
              }))
            )
            : post.UserMedia,
        })),
      );

      let nextCursor: string | undefined;
      if (hasMore && processedPosts.length > 0) {
        const lastPost = processedPosts[processedPosts.length - 1];
        nextCursor = lastPost.id.toString();
      }

      return {
        posts: processedPosts,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      console.error("Error in getUserPosts:", error);
      throw new Error("Failed to fetch user posts");
    }
  }
}

export default FeedService;