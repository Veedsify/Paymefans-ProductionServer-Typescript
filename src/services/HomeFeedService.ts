import type { Post } from "@prisma/client";
import query from "@utils/prisma";
import type { PostWithLike } from "../types/feed";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import GenerateCloudflareSignedUrl from "@libs/GenerateSignedUrls";

class FeedService {
  private static readonly POSTS_PER_HOME_PAGE =
    Number(process.env.POSTS_PER_HOME_PAGE) || 10;
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

  private async calculateRelevanceScore(
    post: Post,
    userId: number,
  ): Promise<number> {
    const [userInteractions, followsCreator, isSubscribed] = await Promise.all([
      query.postLike.findMany({
        where: { user_id: userId },
        include: { post: true },
      }),
      query.follow.findFirst({
        where: { user_id: post.user_id, follower_id: userId },
      }),
      query.subscribers.findFirst({
        where: { user_id: post.user_id, subscriber_id: userId },
      }),
    ]);

    let relevanceScore = 0;
    if (followsCreator) relevanceScore += 0.3;
    if (isSubscribed || userId === post.user_id) relevanceScore += 0.5;

    const similarContentInteraction = userInteractions.filter(
      (interaction) => interaction.post.user_id === post.user_id,
    ).length;

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
    let cursorInfo;

    if (cursor) {
      try {
        cursorInfo = Number(cursor);
      } catch (error) {
        console.error("Invalid cursor:", error);
      }
    }

    const user = await query.user.findFirst({
      where: { id: authUserid },
    });

    // Get list of users who have blocked the current user
    const blockedByUsers = await query.userBlock.findMany({
      where: {
        blocked_id: authUserid,
      },
      select: {
        blocker_id: true,
      },
    });

    const blockedByUserIds = blockedByUsers.map((block) => block.blocker_id);

    let whereClause: any = {
      post_is_visible: true,
      post_status: "approved",
      user: {
        active_status: true,
      },
      // Exclude posts from users who have blocked the current user
      user_id: {
        notIn: blockedByUserIds,
      },
      OR: [
        // Public post
        { post_audience: "public" },
        { post_audience: "followers" },
        { post_audience: "subscribers" },
        { post_audience: "price" },
        {
          user_id: authUserid,
        },
      ],
    };

    // Add cursor conditions if cursor exists
    if (cursorInfo) {
      whereClause = {
        ...whereClause,
        OR: [
          ...whereClause.OR,
          {
            AND: [
              { id: { lt: cursorInfo } },
            ],
          },
        ],
      };
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
            email: true,
            name: true,
            fullname: true,
            user_id: true,
            username: true,
            profile_image: true,
            profile_banner: true,
            bio: true,
            is_model: true,
            Subscribers: { select: { subscriber_id: true, created_at: true } },
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
      take: FeedService.POSTS_PER_HOME_PAGE + 1,
      orderBy: { created_at: "desc" },
    });

    const postsChecked = posts.map(async (post) => {
      const [
        isPaid,
        postLike,
        isReposted,
        isSubscribed,
        checkIfUserCanViewPaidPosts,
      ] = await query.$transaction(async (tx) => {
        const isPaid = await tx.purchasedPosts.findFirst({
          where: {
            post_id: post.id,
            user_id: authUserid,
          },
        });

        const postLike = await tx.postLike.findFirst({
          where: {
            user_id: post.user.id,
            post_id: post.id,
          },
        });

        const isSubscribed = await tx.subscribers.findFirst({
          where: {
            user_id: post.user.id,
            subscriber_id: authUserid,
          },
        });

        const isReposted = await tx.userRepost.findFirst({
          where: {
            user_id: authUserid,
            post_id: post.id,
          },
        });

        const checkIfUserCanViewPaidPosts = RBAC.checkUserFlag(
          user?.flags,
          Permissions.VIEW_PAID_POSTS,
        );

        return [
          isPaid,
          postLike,
          isReposted,
          isSubscribed,
          checkIfUserCanViewPaidPosts,
        ];
      });

      return {
        ...post,
        UserMedia: post.watermark_enabled ? await Promise.all(
          (post.UserMedia || []).map(async (media) => ({
            ...media,
            url: await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.url),
            poster: media.media_type === "image" ? await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.url) : media.poster,
            blur: await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.blur),
          })),
        ) : post.UserMedia,
        likedByme: postLike ? true : false,
        wasReposted: !!isReposted,
        hasPaid:
          !!isPaid ||
          checkIfUserCanViewPaidPosts ||
          post.post_audience !== "price",
        isSubscribed:
          authUserid === post.user.id ||
          checkIfUserCanViewPaidPosts ||
          !!isSubscribed,
      };
    });

    const resolvedPosts = await Promise.all(postsChecked);

    const scoredPosts = await Promise.all(
      resolvedPosts.map(async (post) => {
        const engagementScore = this.calculateEngagementScore(post);
        const recencyScore = this.calculateRecencyScore(post.created_at);
        const relevanceScore = await this.calculateRelevanceScore(
          post,
          authUserid,
        );

        const totalScore =
          engagementScore * FeedService.ENGAGEMENT_WEIGHT +
          recencyScore * FeedService.RECENCY_WEIGHT +
          relevanceScore * FeedService.RELEVANCE_WEIGHT;

        return { ...post, score: totalScore };
      }),
    );

    const sortedPosts = scoredPosts.sort((a, b) => b.score - a.score);
    const hasMore = sortedPosts.length > FeedService.POSTS_PER_HOME_PAGE;
    const postsToReturn = hasMore
      ? sortedPosts.slice(0, FeedService.POSTS_PER_HOME_PAGE)
      : sortedPosts;

    let nextCursor: string | undefined;
    if (hasMore && postsToReturn.length > 0) {
      const lastPost = postsToReturn[postsToReturn.length - 1];
      nextCursor = lastPost.id.toString();
    }

    return {
      posts: postsToReturn,
      nextCursor,
      hasMore,
    };
  }

  public async getUserPosts(
    viewerId: number,
    targetUserId: number,
    cursor?: string,
  ): Promise<{ posts: PostWithLike; nextCursor?: string; hasMore: boolean }> {
    let cursorInfo;

    if (cursor) {
      try {
        cursorInfo = Number(cursor);
      } catch (error) {
        console.error("Invalid cursor:", error);
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

    let whereClause: any = {
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
      whereClause = {
        ...whereClause,
        OR: [
          ...whereClause.OR,
          {
            AND: [
              { id: { lt: cursorInfo } },
            ],
          },
        ],
      };
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
            email: true,
            name: true,
            password: true,
            fullname: true,
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
      orderBy: { created_at: "desc" },
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
        UserMedia: post.watermark_enabled ? await Promise.all(
          (post.UserMedia || []).map(async (media) => ({
            ...media,
            url: await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.url),
            poster: media.media_type === "image" ? await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.url) : media.poster,
            blur: await GenerateCloudflareSignedUrl(media.media_id, media.media_type, media.blur),
          })),
        ) : post.UserMedia,
      }))
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
  }
}

export default FeedService;
