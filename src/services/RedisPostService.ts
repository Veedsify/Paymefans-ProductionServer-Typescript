import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";

export class RedisPostService {
    private static readonly LIKE_COUNT_PREFIX = "post:likes:count:";
    private static readonly LIKED_USERS_PREFIX = "post:likes:users:";
    private static readonly USER_LIKED_POSTS_PREFIX = "user:likes:";
    private static readonly SYNC_PENDING_PREFIX = "sync:pending:likes:";

    /**
     * Get the total like count for a post
     */
    static async getLikeCount(postId: string): Promise<number> {
        try {
            const key = this.LIKE_COUNT_PREFIX + postId;
            const count = await redis.get(key);

            if (count !== null) {
                // Redis has the data, use it
                return parseInt(count, 10);
            }

            // Check if there are pending operations (Redis was initialized but data expired)
            const pendingOps = await this.getPendingSyncOps(postId);
            if (pendingOps.length > 0) {
                // Data expired but has pending operations, return 0 as fallback
                return 0;
            }

            // No Redis data and no pending operations, get from database but don't cache yet
            // Caching will happen when user first interacts with the post
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: { post_likes: true }
            });

            return post?.post_likes || 0;
        } catch (error) {
            console.error('Error getting like count:', error);
            // Fallback to database
            try {
                const post = await query.post.findFirst({
                    where: { post_id: postId },
                    select: { post_likes: true }
                });
                return post?.post_likes || 0;
            } catch {
                return 0;
            }
        }
    }

    /**
     * Check if a user has liked a specific post
     */
    static async hasUserLiked(postId: string, userId: number): Promise<boolean> {
        try {
            const key = this.LIKED_USERS_PREFIX + postId;
            const exists = await redis.exists(key);

            if (exists) {
                // Redis has data for this post
                const isLiked = await redis.sismember(key, userId.toString());
                return isLiked === 1;
            }

            // No Redis data yet, check database but don't initialize
            // Initialization happens on first like action
            const dbLike = await query.postLike.findFirst({
                where: {
                    post_id: parseInt(postId),
                    user_id: userId
                }
            });
            return !!dbLike;
        } catch (error) {
            console.error('Error checking user like status:', error);
            // Fallback to database
            try {
                const dbLike = await query.postLike.findFirst({
                    where: {
                        post_id: parseInt(postId),
                        user_id: userId
                    }
                });
                return !!dbLike;
            } catch {
                return false;
            }
        }
    }

    /**
     * Like a post (add like)
     */
    static async likePost(postId: string, userId: number): Promise<{ success: boolean; isLiked: boolean; newCount: number }> {
        try {
            // Check if Redis has data for this post
            const likeCountKey = this.LIKE_COUNT_PREFIX + postId;
            const likedUsersKey = this.LIKED_USERS_PREFIX + postId;

            const hasRedisData = await redis.exists(likeCountKey);

            if (!hasRedisData) {
                // First interaction with this post - initialize from database
                await this.initializePostFromDB(postId);
            }

            const pipeline = redis.pipeline();
            const syncPendingKey = this.SYNC_PENDING_PREFIX + postId;

            // Check if user already liked the post
            const alreadyLiked = await this.hasUserLiked(postId, userId);

            if (alreadyLiked) {
                // Unlike the post
                pipeline.srem(likedUsersKey, userId.toString());
                pipeline.decr(likeCountKey);
                pipeline.sadd(syncPendingKey, `unlike:${userId}`);
                pipeline.expire(likedUsersKey, 7200); // 2 hours
                pipeline.expire(syncPendingKey, 7200);

                const results = await pipeline.exec();
                const newCount = Math.max(0, (results?.[1]?.[1] as number) || 0);

                return { success: true, isLiked: false, newCount };
            } else {
                // Like the post
                pipeline.sadd(likedUsersKey, userId.toString());
                pipeline.incr(likeCountKey);
                pipeline.sadd(syncPendingKey, `like:${userId}`);
                pipeline.expire(likedUsersKey, 7200); // 2 hours
                pipeline.expire(syncPendingKey, 7200);

                const results = await pipeline.exec();
                const newCount = (results?.[1]?.[1] as number) || 1;

                return { success: true, isLiked: true, newCount };
            }
        } catch (error) {
            console.error('Error liking/unliking post:', error);
            return { success: false, isLiked: false, newCount: 0 };
        }
    }

    /**
     * Initialize post data from database on first interaction
     */
    private static async initializePostFromDB(postId: string): Promise<void> {
        try {
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: {
                    id: true,
                    post_likes: true,
                    PostLike: {
                        select: { user_id: true }
                    }
                }
            });

            if (!post) return;

            const pipeline = redis.pipeline();
            const likedUsersKey = this.LIKED_USERS_PREFIX + postId;
            const likeCountKey = this.LIKE_COUNT_PREFIX + postId;

            // Set like count
            pipeline.set(likeCountKey, post.post_likes.toString(), 'EX', 7200);

            // Add users who liked the post
            if (post.PostLike.length > 0) {
                const userIds = post.PostLike.map(like => like.user_id.toString());
                pipeline.sadd(likedUsersKey, ...userIds);
            } else {
                // Create empty set to mark initialization
                pipeline.sadd(likedUsersKey, '__INIT__');
                pipeline.srem(likedUsersKey, '__INIT__');
            }

            pipeline.expire(likedUsersKey, 7200);
            await pipeline.exec();
        } catch (error) {
            console.error('Error initializing post from DB:', error);
        }
    }

    /**
     * Force sync a post's likes to database immediately (for critical operations)
     */
    static async forceSyncPost(postId: string): Promise<boolean> {
        try {
            await this.syncPostLikes(postId);
            return true;
        } catch (error) {
            console.error(`Failed to force sync post ${postId}:`, error);
            return false;
        }
    }

    /**
   * Get posts that a user has liked
   */
    static async getUserLikedPosts(userId: number, page: number = 1, limit: number = 20): Promise<string[]> {
        try {
            const key = this.USER_LIKED_POSTS_PREFIX + userId;
            const start = (page - 1) * limit;
            const end = start + limit - 1;

            const posts = await redis.lrange(key, start, end);
            return posts;
        } catch (error) {
            console.error('Error getting user liked posts:', error);
            return [];
        }
    }

    /**
     * Get pending sync operations for a post
     */
    static async getPendingSyncOps(postId: string): Promise<string[]> {
        try {
            const key = this.SYNC_PENDING_PREFIX + postId;
            return await redis.smembers(key);
        } catch (error) {
            console.error('Error getting pending sync ops:', error);
            return [];
        }
    }

    /**
     * Clear pending sync operations after successful sync
     */
    static async clearPendingSyncOps(postId: string): Promise<void> {
        try {
            const key = this.SYNC_PENDING_PREFIX + postId;
            await redis.del(key);
        } catch (error) {
            console.error('Error clearing pending sync ops:', error);
        }
    }

    /**
     * Sync all pending operations for all posts
     */
    static async syncAllPendingLikes(): Promise<{ synced: number; errors: number }> {
        try {
            const pattern = this.SYNC_PENDING_PREFIX + "*";
            const keys = await redis.keys(pattern);

            let synced = 0;
            let errors = 0;

            for (const key of keys) {
                const postId = key.replace(this.SYNC_PENDING_PREFIX, "");
                try {
                    await this.syncPostLikes(postId);
                    synced++;
                } catch (error) {
                    console.error(`Error syncing post ${postId}:`, error);
                    errors++;
                }
            }

            return { synced, errors };
        } catch (error) {
            console.error('Error syncing all pending likes:', error);
            return { synced: 0, errors: 1 };
        }
    }

    /**
     * Sync likes for a specific post from Redis to database
     */
    static async syncPostLikes(postId: string): Promise<void> {
        try {
            const pendingOps = await this.getPendingSyncOps(postId);

            if (pendingOps.length === 0) return;

            // Get current Redis state
            const currentLikeCount = await this.getLikeCount(postId);
            const likedUsersKey = this.LIKED_USERS_PREFIX + postId;
            const currentLikedUsers = await redis.smembers(likedUsersKey);

            // Find post in database
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: { id: true }
            });

            if (!post) {
                console.warn(`Post ${postId} not found in database`);
                await this.clearPendingSyncOps(postId);
                return;
            }

            // Use transaction to ensure consistency
            await query.$transaction(async (prisma) => {
                // Delete all existing likes for this post
                await prisma.postLike.deleteMany({
                    where: { post_id: post.id }
                });

                // Create new likes based on Redis state
                if (currentLikedUsers.length > 0) {
                    const likesToCreate = currentLikedUsers.map(userId => ({
                        post_id: post.id,
                        user_id: parseInt(userId, 10),
                        like_id: 1 // This seems to be a constant in your schema
                    }));

                    await prisma.postLike.createMany({
                        data: likesToCreate,
                        skipDuplicates: true
                    });
                }

                // Update post like count
                await prisma.post.update({
                    where: { id: post.id },
                    data: { post_likes: currentLikeCount }
                });
            });

            // Clear pending operations after successful sync
            await this.clearPendingSyncOps(postId);
        } catch (error) {
            console.error(`Error syncing post ${postId}:`, error);
            throw error;
        }
    }

    /**
     * Get multiple posts' like data efficiently
     */
    static async getMultiplePostsLikeData(postIds: string[], userId?: number): Promise<Map<string, { count: number; isLiked: boolean }>> {
        try {
            const result = new Map<string, { count: number; isLiked: boolean }>();

            // Get data from Redis where available, fallback to database for missing data
            const pipeline = redis.pipeline();
            postIds.forEach(postId => {
                pipeline.get(this.LIKE_COUNT_PREFIX + postId);
                if (userId) {
                    pipeline.sismember(this.LIKED_USERS_PREFIX + postId, userId.toString());
                }
            });

            const results = await pipeline.exec();

            let resultIndex = 0;
            for (const postId of postIds) {
                const redisCount = results?.[resultIndex]?.[1] as string | null;
                let count = 0;
                let isLiked = false;

                if (redisCount !== null) {
                    // Redis has data
                    count = parseInt(redisCount, 10);
                    if (userId) {
                        isLiked = (results?.[resultIndex + 1]?.[1] as number) === 1;
                        resultIndex += 2;
                    } else {
                        resultIndex += 1;
                    }
                } else {
                    // No Redis data, get from database
                    try {
                        const post = await query.post.findFirst({
                            where: { post_id: postId },
                            select: {
                                post_likes: true,
                                PostLike: userId ? {
                                    where: { user_id: userId },
                                    select: { user_id: true }
                                } : false
                            }
                        });

                        count = post?.post_likes || 0;
                        isLiked = userId ? (post?.PostLike as any[])?.length > 0 : false;
                    } catch (error) {
                        console.error(`Error getting DB data for post ${postId}:`, error);
                    }

                    if (userId) {
                        resultIndex += 2;
                    } else {
                        resultIndex += 1;
                    }
                }

                result.set(postId, { count, isLiked });
            }

            return result;
        } catch (error) {
            console.error('Error getting multiple posts like data:', error);
            // Fallback to database for all posts
            const result = new Map<string, { count: number; isLiked: boolean }>();

            try {
                const posts = await query.post.findMany({
                    where: {
                        post_id: { in: postIds }
                    },
                    select: {
                        post_id: true,
                        post_likes: true,
                        PostLike: userId ? {
                            where: { user_id: userId },
                            select: { user_id: true }
                        } : false
                    }
                });

                posts.forEach(post => {
                    result.set(post.post_id, {
                        count: post.post_likes,
                        isLiked: userId ? (post.PostLike as any[]).length > 0 : false
                    });
                });

                // Fill in missing posts with default values
                postIds.forEach(postId => {
                    if (!result.has(postId)) {
                        result.set(postId, { count: 0, isLiked: false });
                    }
                });

            } catch (dbError) {
                console.error('Database fallback also failed:', dbError);
                // Final fallback
                postIds.forEach(postId => {
                    result.set(postId, { count: 0, isLiked: false });
                });
            }

            return result;
        }
    }
}