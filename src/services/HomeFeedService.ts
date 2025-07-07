import type { Post } from "@prisma/client";
import query from "@utils/prisma";
import type { PostWithLike } from "../types/feed";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import { JsonValue } from "@prisma/client/runtime/library";

interface CursorInfo {
  timestamp: Date;
  score: number;
  id: number;
}

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
    let cursorInfo: CursorInfo | null = null;
    const user = await query.user.findFirst({
      where: { id: authUserid },
    });

    if (cursor) {
      try {
        cursorInfo = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch (error) {
        console.error("Invalid cursor:", error);
      }
    }

    let whereClause: any = {
      post_is_visible: true,
      post_status: "approved",
      user: {
        active_status: true,
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
        AND: [
          whereClause,
          {
            OR: [
              {
                created_at: { lt: cursorInfo.timestamp },
              },
              {
                AND: [
                  { created_at: cursorInfo.timestamp },
                  { id: { lt: cursorInfo.id } },
                ],
              },
            ],
          },
        ],
      };
    }

    const posts = await query.post.findMany({
      where: whereClause,
      include: {
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
        UserMedia: true,
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
      const cursorData: CursorInfo = {
        timestamp: lastPost.created_at,
        score: lastPost.score,
        id: lastPost.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
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
    let cursorInfo: CursorInfo | null = null;

    if (cursor) {
      try {
        cursorInfo = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch (error) {
        console.error("Invalid cursor:", error);
      }
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
        AND: [
          whereClause,
          {
            OR: [
              {
                created_at: { lt: cursorInfo.timestamp },
              },
              {
                AND: [
                  { created_at: cursorInfo.timestamp },
                  { id: { lt: cursorInfo.id } },
                ],
              },
            ],
          },
        ],
      };
    }

    const posts = await query.post.findMany({
      where: whereClause,
      include: {
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
        UserMedia: true,
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

    let nextCursor: string | undefined;
    if (hasMore && postsToReturn.length > 0) {
      const lastPost = postsToReturn[postsToReturn.length - 1];
      const cursorData: CursorInfo = {
        timestamp: lastPost.created_at,
        score: 0, // User posts don't have relevance scores
        id: lastPost.id,
      };
      nextCursor = Buffer.from(JSON.stringify(cursorData)).toString("base64");
    }

    return {
      posts: postsToReturn,
      nextCursor,
      hasMore,
    };
  }
}

export default FeedService;
