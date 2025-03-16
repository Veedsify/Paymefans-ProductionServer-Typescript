import { Post } from "@prisma/client";
import query from "@utils/prisma";

class FeedService {
  private static readonly POSTS_PER_HOME_PAGE = Number(process.env.POSTS_PER_HOME_PAGE) || 10;
  private static readonly ENGAGEMENT_WEIGHT = 0.4;
  private static readonly RECENCY_WEIGHT = 0.3;
  private static readonly RELEVANCE_WEIGHT = 0.3;
  private static readonly TIME_DECAY_FACTOR = 0.1;

  private calculateEngagementScore(post: Post): number {
    const totalInteractions = post.post_likes + post.post_comments + post.post_reposts;
    return (
      (post.post_likes * 1 + post.post_comments * 1.5 + post.post_reposts * 2) /
      (totalInteractions || 1)
    );
  }

  private calculateRecencyScore(postDate: Date): number {
    const ageInHours = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
    return Math.exp(-FeedService.TIME_DECAY_FACTOR * ageInHours);
  }

  private async calculateRelevanceScore(post: Post, userId: number): Promise<number> {
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
    if (isSubscribed) relevanceScore += 0.5;

    const similarContentInteraction = userInteractions.filter(
      (interaction) => interaction.post.user_id === post.user_id
    ).length;

    relevanceScore += Math.min(similarContentInteraction * 0.1, 0.2);
    return Math.min(relevanceScore, 1);
  }

  public async getHomeFeed(userId: number, page: number): Promise<{
    posts: Array<Post & { score: number }>;
    page: number;
    hasMore: boolean;
  }> {
    const skip = (page - 1) * FeedService.POSTS_PER_HOME_PAGE;

    const posts = await query.post.findMany({
      where: {
        post_is_visible: true,
        post_status: "approved",
        OR: [
          { post_audience: "public" },
          {
            AND: [
              { post_audience: "followers" },
              { user: { Follow: { some: { follower_id: userId } } } },
            ],
          },
          {
            AND: [
              { post_audience: "subscribers" },
              { user: { Subscribers: { some: { subscriber_id: userId } } } },
            ],
          },
        ],
      },
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
            Subscribers: { select: { subscriber_id: true, created_at: true } },
            total_followers: true,
          },
        },
        UserMedia: true,
        PostLike: true,
        UserRepost: true,
      },
      skip,
      take: FeedService.POSTS_PER_HOME_PAGE,
      orderBy: { created_at: "desc" },
    });

    const scoredPosts = await Promise.all(
      posts.map(async (post) => {
        const engagementScore = this.calculateEngagementScore(post);
        const recencyScore = this.calculateRecencyScore(post.created_at);
        const relevanceScore = await this.calculateRelevanceScore(post, userId);

        const totalScore =
          engagementScore * FeedService.ENGAGEMENT_WEIGHT +
          recencyScore * FeedService.RECENCY_WEIGHT +
          relevanceScore * FeedService.RELEVANCE_WEIGHT;

        return { ...post, score: totalScore };
      })
    );

    return {
      posts: scoredPosts.sort((a, b) => b.score - a.score),
      page,
      hasMore: scoredPosts.length === FeedService.POSTS_PER_HOME_PAGE,
    };
  }

  public async getUserPosts(
    viewerId: number,
    targetUserId: number,
    page: number
  ): Promise<{ posts: Post[]; page: number; hasMore: boolean }> {
    const skip = (page - 1) * FeedService.POSTS_PER_HOME_PAGE;

    const [isFollowing, isSubscribed] = await Promise.all([
      query.follow.findFirst({
        where: { user_id: targetUserId, follower_id: viewerId },
      }),
      query.subscribers.findFirst({
        where: { user_id: targetUserId, subscriber_id: viewerId },
      }),
    ]);

    const posts = await query.post.findMany({
      where: {
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
      },
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
      skip,
      take: FeedService.POSTS_PER_HOME_PAGE,
    });

    return {
      posts,
      page,
      hasMore: posts.length === FeedService.POSTS_PER_HOME_PAGE,
    };
  }
}

export default FeedService;
