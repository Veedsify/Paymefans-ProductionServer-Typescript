import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";

export class RedisPostService {
    private static readonly LIKE_COUNT_PREFIX = "post:likes:count:";
    private static readonly LIKED_USERS_PREFIX = "post:likes:users:";
    private static readonly SYNC_PENDING_PREFIX = "sync:pending:likes:";
    private static readonly SYNC_LOCK_PREFIX = "lock:sync:";

    // Default like type ID (can be made configurable if needed)
    private static readonly DEFAULT_LIKE_ID = 1;

    // TTL for sync pending keys (7 days) - prevents accumulation of failed sync operations
    // If syncing fails repeatedly, these keys will eventually expire and be cleaned up
    private static readonly SYNC_PENDING_TTL = 604800;

    /**
     * Get the total like count for a post
     */
    static async getLikeCount(postId: string): Promise<number> {
        try {
            const key = this.LIKE_COUNT_PREFIX + postId;
            const count = await redis.get(key);

            if (count !== null) {
                // Redis has the data, use it and refresh TTL
                await redis.expire(key, 7200);
                return parseInt(count, 10);
            }

            // Check if there are pending operations (Redis was initialized but data expired)
            const pendingOps = await this.getPendingSyncOps(postId);
            if (pendingOps.length > 0) {
                // Data expired but has pending operations
                // Need to reconstruct the true count by getting DB state and applying pending ops
                const post = await query.post.findFirst({
                    where: { post_id: postId },
                    select: {
                        id: true,
                        PostLike: {
                            select: { user_id: true },
                        },
                    },
                });

                if (!post) return 0;

                // Get current DB liked users
                const dbLikedUsers = new Set(
                    post.PostLike.map((like) => like.user_id),
                );

                // Parse pending operations - track final state per user
                const userFinalState = new Map<number, "like" | "unlike">();

                for (const op of pendingOps) {
                    const [action, userIdStr] = op.split(":");
                    const userId = parseInt(userIdStr, 10);

                    if (action === "like" || action === "unlike") {
                        userFinalState.set(userId, action as "like" | "unlike");
                    }
                }

                // Apply pending operations to DB state to get final user set
                const finalLikedUsers = new Set(dbLikedUsers);

                for (const [userId, finalAction] of userFinalState) {
                    if (finalAction === "like") {
                        finalLikedUsers.add(userId);
                    } else if (finalAction === "unlike") {
                        finalLikedUsers.delete(userId);
                    }
                }

                return finalLikedUsers.size;
            }

            // No Redis data and no pending operations, get from database but don't cache yet
            // Caching will happen when user first interacts with the post
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: { post_likes: true },
            });

            return post?.post_likes || 0;
        } catch (error) {
            console.error("Error getting like count:", error);
            // Fallback to database
            try {
                const post = await query.post.findFirst({
                    where: { post_id: postId },
                    select: { post_likes: true },
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
    static async hasUserLiked(
        postId: string,
        userId: number,
    ): Promise<boolean> {
        try {
            const key = this.LIKED_USERS_PREFIX + postId;
            const exists = await redis.exists(key);

            if (exists) {
                // Redis has data for this post
                const isLiked = await redis.sismember(key, userId.toString());
                // Refresh TTL on access
                await redis.expire(key, 7200);
                return isLiked === 1;
            }

            // No Redis data yet, check database but don't initialize
            // Initialization happens on first like action
            // FIXED: Must get post's numeric id first, then check PostLike table
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: { id: true },
            });

            if (!post) return false;

            const dbLike = await query.postLike.findFirst({
                where: {
                    post_id: post.id, // Use numeric id, not string post_id
                    user_id: userId,
                },
            });
            return !!dbLike;
        } catch (error) {
            console.error("Error checking user like status:", error);
            // Fallback to database
            try {
                const post = await query.post.findFirst({
                    where: { post_id: postId },
                    select: { id: true },
                });

                if (!post) return false;

                const dbLike = await query.postLike.findFirst({
                    where: {
                        post_id: post.id, // Use numeric id, not string post_id
                        user_id: userId,
                    },
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
    static async likePost(
        postId: string,
        userId: number,
    ): Promise<{ success: boolean; isLiked: boolean; newCount: number }> {
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
                // Get current count first to prevent negative values
                const currentCount = await redis.get(likeCountKey);
                const currentCountNum = parseInt(currentCount || "0", 10);

                console.log(
                    `👎 User ${userId} unliking post ${postId}. Current count: ${currentCountNum}`,
                );

                pipeline.srem(likedUsersKey, userId.toString());
                pipeline.decr(likeCountKey);
                pipeline.sadd(syncPendingKey, `unlike:${userId}`);
                pipeline.expire(likedUsersKey, 7200); // 2 hours
                pipeline.expire(syncPendingKey, this.SYNC_PENDING_TTL); // 7 days - cleanup failed syncs

                const results = await pipeline.exec();
                const newCount = Math.max(
                    0,
                    (results?.[1]?.[1] as number) || 0,
                );

                // Warn if count would go negative
                if (currentCountNum <= 0) {
                    console.warn(
                        `⚠️ Warning: Unlike operation on post ${postId} with count ${currentCountNum}. Clamping to 0.`,
                    );
                    // Fix the count in Redis if it went negative
                    await redis.set(likeCountKey, "0", "EX", 7200);
                }

                console.log(`✅ Post ${postId} new count: ${newCount}`);
                return { success: true, isLiked: false, newCount };
            } else {
                // Like the post
                const currentCount = await redis.get(likeCountKey);
                const currentCountNum = parseInt(currentCount || "0", 10);

                console.log(
                    `👍 User ${userId} liking post ${postId}. Current count: ${currentCountNum}`,
                );

                pipeline.sadd(likedUsersKey, userId.toString());
                pipeline.incr(likeCountKey);
                pipeline.sadd(syncPendingKey, `like:${userId}`);
                pipeline.expire(likedUsersKey, 7200); // 2 hours
                pipeline.expire(syncPendingKey, this.SYNC_PENDING_TTL); // 7 days - cleanup failed syncs

                const results = await pipeline.exec();
                const newCount = (results?.[1]?.[1] as number) || 1;

                console.log(`✅ Post ${postId} new count: ${newCount}`);
                return { success: true, isLiked: true, newCount };
            }
        } catch (error) {
            console.error("Error liking/unliking post:", error);
            return { success: false, isLiked: false, newCount: 0 };
        }
    }

    /**
     * Initialize post data from database on first interaction
     * CRITICAL: Checks for pending sync operations to avoid overwriting uncommitted likes
     */
    private static async initializePostFromDB(postId: string): Promise<void> {
        try {
            // IMPORTANT: Check for pending operations first!
            // If there are pending operations, it means Redis expired but sync hasn't happened
            // We need to reconstruct the true state, not blindly trust the database
            const pendingOps = await this.getPendingSyncOps(postId);

            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: {
                    id: true,
                    post_likes: true,
                    PostLike: {
                        select: { user_id: true },
                    },
                },
            });

            if (!post) return;

            const pipeline = redis.pipeline();
            const likedUsersKey = this.LIKED_USERS_PREFIX + postId;
            const likeCountKey = this.LIKE_COUNT_PREFIX + postId;

            let finalLikeCount: number;
            let finalLikedUsers: Set<number>;

            if (pendingOps.length > 0) {
                // Reconstruct true state by applying pending ops to DB state
                const dbLikedUsers = new Set(
                    post.PostLike.map((like) => like.user_id),
                );

                // Parse pending operations - last action per user wins
                const userFinalState = new Map<number, "like" | "unlike">();
                for (const op of pendingOps) {
                    const [action, userIdStr] = op.split(":");
                    const userId = parseInt(userIdStr, 10);
                    if (action === "like" || action === "unlike") {
                        userFinalState.set(userId, action as "like" | "unlike");
                    }
                }

                // Apply pending operations to get final state
                finalLikedUsers = new Set(dbLikedUsers);
                for (const [userId, finalAction] of userFinalState) {
                    if (finalAction === "like") {
                        finalLikedUsers.add(userId);
                    } else if (finalAction === "unlike") {
                        finalLikedUsers.delete(userId);
                    }
                }

                finalLikeCount = finalLikedUsers.size;
                console.log(
                    `⚠️ Reinitializing post ${postId} with ${pendingOps.length} pending ops. DB count: ${post.post_likes}, Reconstructed count: ${finalLikeCount}`,
                );
            } else {
                // No pending operations, trust the database
                finalLikeCount = post.post_likes;
                finalLikedUsers = new Set(
                    post.PostLike.map((like) => like.user_id),
                );
            }

            // Set like count with the correct value
            pipeline.set(likeCountKey, finalLikeCount.toString(), "EX", 7200);

            // Add users who liked the post
            if (finalLikedUsers.size > 0) {
                const userIds = Array.from(finalLikedUsers).map((id) =>
                    id.toString(),
                );
                pipeline.sadd(likedUsersKey, ...userIds);
            } else {
                // Create empty set to mark initialization
                pipeline.sadd(likedUsersKey, "__INIT__");
                pipeline.srem(likedUsersKey, "__INIT__");
            }

            pipeline.expire(likedUsersKey, 7200);
            await pipeline.exec();
        } catch (error) {
            console.error("Error initializing post from DB:", error);
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
     * Get pending sync operations for a post
     */
    static async getPendingSyncOps(postId: string): Promise<string[]> {
        try {
            const key = this.SYNC_PENDING_PREFIX + postId;
            return await redis.smembers(key);
        } catch (error) {
            console.error("Error getting pending sync ops:", error);
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
            console.error("Error clearing pending sync ops:", error);
        }
    }

    /**
     * Sync all pending operations for all posts
     */
    static async syncAllPendingLikes(): Promise<{
        synced: number;
        errors: number;
    }> {
        try {
            const pattern = this.SYNC_PENDING_PREFIX + "*";
            const keys: string[] = [];

            // Use SCAN instead of KEYS for better memory efficiency
            let cursor = 0;
            do {
                const [nextCursor, scanKeys] = await redis.scan(
                    cursor,
                    "MATCH",
                    pattern,
                    "COUNT",
                    100,
                );
                cursor = parseInt(nextCursor, 10);
                keys.push(...scanKeys);
            } while (cursor !== 0);

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
            console.error("Error syncing all pending likes:", error);
            return { synced: 0, errors: 1 };
        }
    }

    /**
     * Sync likes for a specific post from Redis to database
     */
    static async syncPostLikes(postId: string): Promise<void> {
        try {
            // Try to acquire lock atomically using Lua script
            const lockScript = `
                if redis.call('setnx', KEYS[1], ARGV[1]) == 1 then
                    redis.call('expire', KEYS[1], ARGV[2])
                    return 1
                else
                    return 0
                end
            `;
            const lockAcquired = await redis.eval(
                lockScript,
                1,
                this.SYNC_LOCK_PREFIX + postId,
                "1",
                "30",
            );

            if (!lockAcquired) {
                console.log(
                    `🔒 Sync already in progress for post ${postId}, skipping`,
                );
                return;
            }

            const pendingOps = await this.getPendingSyncOps(postId);

            if (pendingOps.length === 0) {
                await redis.del(this.SYNC_LOCK_PREFIX + postId); // Release lock
                return;
            }

            // Get current Redis liked users set to calculate the actual count
            const likedUsersKey = this.LIKED_USERS_PREFIX + postId;
            const redisUserIds = await redis.smembers(likedUsersKey);

            // Filter out the __INIT__ marker if it exists
            const actualRedisLikedUsers = new Set(
                redisUserIds
                    .filter((id) => id !== "__INIT__")
                    .map((id) => parseInt(id, 10)),
            );

            // Find post in database
            const post = await query.post.findFirst({
                where: { post_id: postId },
                select: { id: true },
            });

            if (!post) {
                console.warn(`Post ${postId} not found in database`);
                await this.clearPendingSyncOps(postId);
                await redis.del(this.SYNC_LOCK_PREFIX + postId); // Release lock
                return;
            }

            // Parse pending operations to determine what to do
            // Use a Map to track the FINAL state of each user (last action wins)
            const userActions = new Map<number, "like" | "unlike">();

            for (const op of pendingOps) {
                const [action, userIdStr] = op.split(":");
                const userId = parseInt(userIdStr, 10);

                if (action === "like" || action === "unlike") {
                    userActions.set(userId, action as "like" | "unlike");
                }
            }

            // Calculate the actual current count from Redis state + pending operations
            let currentLikeCount = actualRedisLikedUsers.size;

            // Apply pending operations to the Redis set to get final count
            for (const [userId, action] of userActions) {
                const wasInRedis = actualRedisLikedUsers.has(userId);

                if (action === "like" && !wasInRedis) {
                    currentLikeCount++;
                } else if (action === "unlike" && wasInRedis) {
                    currentLikeCount = Math.max(0, currentLikeCount - 1);
                }
            }

            // Get current database state for these users
            const userIds = Array.from(userActions.keys());
            const existingLikes = await query.postLike.findMany({
                where: {
                    post_id: post.id,
                    user_id: { in: userIds },
                },
                select: { user_id: true },
            });

            const existingLikeSet = new Set(
                existingLikes.map((like) => like.user_id),
            );

            // Determine what operations are actually needed
            const usersToLike: number[] = [];
            const usersToUnlike: number[] = [];

            for (const [userId, finalAction] of userActions) {
                const currentlyLiked = existingLikeSet.has(userId);

                if (finalAction === "like" && !currentlyLiked) {
                    usersToLike.push(userId);
                } else if (finalAction === "unlike" && currentlyLiked) {
                    usersToUnlike.push(userId);
                }
                // If finalAction matches current state, no operation needed
            }

            // Batch database operations
            await query.$transaction(async (prisma) => {
                // Delete unlikes in batch
                if (usersToUnlike.length > 0) {
                    await prisma.postLike.deleteMany({
                        where: {
                            post_id: post.id,
                            user_id: { in: usersToUnlike },
                        },
                    });
                }

                // Insert likes in batch (skip duplicates)
                if (usersToLike.length > 0) {
                    const likesToCreate = usersToLike.map((userId) => ({
                        post_id: post.id,
                        user_id: userId,
                        like_id: this.DEFAULT_LIKE_ID,
                    }));

                    await prisma.postLike.createMany({
                        data: likesToCreate,
                        skipDuplicates: true,
                    });
                }

                // Update post like count to match Redis (ground truth)
                await prisma.post.update({
                    where: { id: post.id },
                    data: { post_likes: currentLikeCount },
                });
            });

            // Clear pending operations only after successful sync
            await this.clearPendingSyncOps(postId);

            console.log(
                `✅ Synced post ${postId}: ${usersToLike.length} likes, ${usersToUnlike.length} unlikes, final count: ${currentLikeCount}`,
            );
        } catch (error) {
            console.error(`Error syncing post ${postId}:`, error);
            throw error;
        } finally {
            // Always release the lock
            await redis.del(this.SYNC_LOCK_PREFIX + postId);
        }
    }

    /**
     * Get multiple posts' like data efficiently
     */
    static async getMultiplePostsLikeData(
        postIds: string[],
        userId?: number,
    ): Promise<Map<string, { count: number; isLiked: boolean }>> {
        try {
            const result = new Map<
                string,
                { count: number; isLiked: boolean }
            >();

            // Get data from Redis where available, fallback to database for missing data
            const pipeline = redis.pipeline();
            postIds.forEach((postId) => {
                pipeline.get(this.LIKE_COUNT_PREFIX + postId);
                if (userId) {
                    pipeline.sismember(
                        this.LIKED_USERS_PREFIX + postId,
                        userId.toString(),
                    );
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
                        isLiked =
                            (results?.[resultIndex + 1]?.[1] as number) === 1;
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
                                PostLike: userId
                                    ? {
                                          where: { user_id: userId },
                                          select: { user_id: true },
                                      }
                                    : false,
                            },
                        });

                        count = post?.post_likes || 0;
                        isLiked = userId
                            ? (post?.PostLike as any[])?.length > 0
                            : false;
                    } catch (error) {
                        console.error(
                            `Error getting DB data for post ${postId}:`,
                            error,
                        );
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
            console.error("Error getting multiple posts like data:", error);
            // Fallback to database for all posts
            const result = new Map<
                string,
                { count: number; isLiked: boolean }
            >();

            try {
                const posts = await query.post.findMany({
                    where: {
                        post_id: { in: postIds },
                    },
                    select: {
                        post_id: true,
                        post_likes: true,
                        PostLike: userId
                            ? {
                                  where: { user_id: userId },
                                  select: { user_id: true },
                              }
                            : false,
                    },
                });

                posts.forEach((post) => {
                    result.set(post.post_id, {
                        count: post.post_likes,
                        isLiked: userId
                            ? (post.PostLike as any[]).length > 0
                            : false,
                    });
                });

                // Fill in missing posts with default values
                postIds.forEach((postId) => {
                    if (!result.has(postId)) {
                        result.set(postId, { count: 0, isLiked: false });
                    }
                });
            } catch (dbError) {
                console.error("Database fallback also failed:", dbError);
                // Final fallback
                postIds.forEach((postId) => {
                    result.set(postId, { count: 0, isLiked: false });
                });
            }

            return result;
        }
    }
}
