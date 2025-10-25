import { Job, Queue, Worker } from "bullmq";
import { redis } from "@libs/RedisStore";
import { RedisPostService } from "@services/RedisPostService";

// Create the queue for post like synchronization
export const PostLikeSyncQueue = new Queue("PostLikeSync", {
    connection: redis,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
        removeOnComplete: 10,
        removeOnFail: 5,
    },
});

// Job data interface
interface PostLikeSyncJobData {
    type: "sync_all_likes" | "sync_single_post";
    postId?: string;
    triggeredBy?: string;
}

// Add recurring job for syncing all likes every 5 minutes
export const schedulePostLikeSync = async () => {
    try {
        // Remove existing cron job if it exists
        await PostLikeSyncQueue.removeJobScheduler("sync-all-likes");

        // Add new cron job
        await PostLikeSyncQueue.add(
            "sync-all-likes",
            {
                type: "sync_all_likes",
                triggeredBy: "scheduled",
            } as PostLikeSyncJobData,
            {
                repeat: {
                    pattern: "*/1 * * * *", // Every 5 minutes
                },
                jobId: "sync-all-likes",
            },
        );
    } catch (error) {
        console.error("❌ Error scheduling post like sync job:", error);
    }
};

// Worker to process the sync jobs
export const PostLikeSyncWorker = new Worker(
    "PostLikeSync",
    async (job: Job<PostLikeSyncJobData>) => {
        const { type, postId } = job.data;

        try {
            switch (type) {
                case "sync_all_likes":
                    const result = await RedisPostService.syncAllPendingLikes();

                    // Update job progress and return result
                    await job.updateProgress(100);
                    return {
                        success: true,
                        synced: result.synced,
                        errors: result.errors,
                        message: `Successfully synced ${result.synced} posts with ${result.errors} errors`,
                    };

                case "sync_single_post":
                    if (!postId) {
                        throw new Error(
                            "Post ID is required for single post sync",
                        );
                    }

                    await RedisPostService.syncPostLikes(postId);

                    await job.updateProgress(100);
                    return {
                        success: true,
                        postId,
                        message: `Successfully synced post ${postId}`,
                    };

                default:
                    throw new Error(`Unknown job type: ${type}`);
            }
        } catch (error: any) {
            console.error(`❌ Error processing ${type} job:`, error);
            throw error;
        }
    },
    {
        connection: redis,
        concurrency: 5, // Process up to 5 jobs concurrently
    },
);

// Error handling for the worker
PostLikeSyncWorker.on("failed", (job, err) => {
    console.error(`❌ Post like sync job ${job?.id} failed:`, err.message);
});

PostLikeSyncWorker.on("completed", (job, result) => {
    console.log(`✅ Post like sync job ${job.id} completed:`, result.message);
});

PostLikeSyncWorker.on("stalled", (jobId) => {
    console.warn(`⚠️ Post like sync job ${jobId} stalled`);
});

// Utility function to manually trigger sync for a specific post
export const triggerPostSync = async (
    postId: string,
    triggeredBy: string = "manual",
) => {
    try {
        const job = await PostLikeSyncQueue.add(
            `sync-post-${postId}`,
            {
                type: "sync_single_post",
                postId,
                triggeredBy,
            } as PostLikeSyncJobData,
            {
                priority: 10, // Higher priority than scheduled jobs
            },
        );

        return job;
    } catch (error) {
        console.error(`❌ Error triggering sync for post ${postId}:`, error);
        throw error;
    }
};

// Utility function to get queue stats
export const getPostLikeSyncStats = async () => {
    try {
        const waiting = await PostLikeSyncQueue.getWaiting();
        const active = await PostLikeSyncQueue.getActive();
        const completed = await PostLikeSyncQueue.getCompleted();
        const failed = await PostLikeSyncQueue.getFailed();

        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
            total:
                waiting.length +
                active.length +
                completed.length +
                failed.length,
        };
    } catch (error) {
        console.error("❌ Error getting queue stats:", error);
        return null;
    }
};

// Graceful shutdown
export const shutdownPostLikeSyncWorker = async () => {
    try {
        await PostLikeSyncWorker.close();
        await PostLikeSyncQueue.close();
    } catch (error) {
        console.error("❌ Error shutting down post like sync worker:", error);
    }
};

// Initialize the scheduler when this module is imported
schedulePostLikeSync().catch(console.error);
