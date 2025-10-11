import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "@libs/RedisStore";
import { RecommendationService } from "@services/RecommendationService";
import query from "@utils/prisma";

interface RecommendationJobData {
  userId: number;
  priority: "high" | "normal" | "low";
}

/**
 * RecommendationWorkerService - Background service for pre-computing user recommendations
 * This ensures users have fresh recommendations ready when they visit the feed
 */
export class RecommendationWorkerService {
  private static recommendationQueue: Queue<RecommendationJobData>;
  private static recommendationWorker: Worker<RecommendationJobData>;
  private static queueEvents: QueueEvents;
  private static isInitialized = false;

  /**
   * Initialize the recommendation worker system
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log("⚠️ RecommendationWorkerService already initialized");
      return;
    }

    try {
      this.setupQueue();
      this.setupWorker();
      this.setupQueueEvents();

      // Schedule periodic batch updates
      await this.schedulePeriodicUpdates();

      this.isInitialized = true;
      console.log("✅ RecommendationWorkerService initialized successfully");
    } catch (error) {
      console.error(
        "❌ Failed to initialize RecommendationWorkerService:",
        error
      );
      throw error;
    }
  }

  /**
   * Setup the recommendation queue
   */
  private static setupQueue(): void {
    this.recommendationQueue = new Queue<RecommendationJobData>(
      "recommendation-queue",
      {
        connection: redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: "exponential",
            delay: 5000,
          },
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 3600, // Remove after 1 hour
          },
          removeOnFail: {
            count: 500, // Keep last 500 failed jobs for debugging
          },
        },
      }
    );

    console.log("📋 Recommendation queue created");
  }

  /**
   * Setup the worker to process recommendation jobs
   */
  private static setupWorker(): void {
    this.recommendationWorker = new Worker<RecommendationJobData>(
      "recommendation-queue",
      async (job) => {
        const { userId, priority } = job.data;

        try {
          console.log(
            `🔄 Computing recommendations for user ${userId} (priority: ${priority})`
          );

          const success = await RecommendationService.preComputeFeed(userId);

          if (success) {
            console.log(`✅ Recommendations computed for user ${userId}`);
            return { userId, success: true };
          } else {
            throw new Error(
              `Failed to compute recommendations for user ${userId}`
            );
          }
        } catch (error) {
          console.error(
            `❌ Error processing recommendation job for user ${userId}:`,
            error
          );
          throw error;
        }
      },
      {
        connection: redis,
        concurrency: 10, // Process up to 10 jobs concurrently
        limiter: {
          max: 20, // Max 20 jobs
          duration: 1000, // per second
        },
      }
    );

    this.recommendationWorker.on("completed", (job) => {
      console.log(`✅ Job ${job.id} completed for user ${job.data.userId}`);
    });

    this.recommendationWorker.on("failed", (job, err) => {
      console.error(
        `❌ Job ${job?.id} failed for user ${job?.data.userId}:`,
        err.message
      );
    });

    console.log("👷 Recommendation worker created");
  }

  /**
   * Setup queue events monitoring
   */
  private static setupQueueEvents(): void {
    this.queueEvents = new QueueEvents("recommendation-queue", {
      connection: redis,
    });

    this.queueEvents.on("completed", ({ jobId }) => {
      console.log(`📊 Event: Job ${jobId} completed`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.error(`📊 Event: Job ${jobId} failed:`, failedReason);
    });

    console.log("📡 Queue events monitoring started");
  }

  /**
   * Schedule periodic batch updates for active users
   */
  private static async schedulePeriodicUpdates(): Promise<void> {
    try {
      // Schedule a repeating job to update active users' recommendations
      await this.recommendationQueue.add(
        "batch-update-active-users",
        { userId: 0, priority: "normal" } as RecommendationJobData,
        {
          repeat: {
            pattern: "0 */2 * * *", // Every 2 hours
          },
          jobId: "batch-update-active-users-cron",
        }
      );

      // Add a separate worker for batch updates
      this.recommendationWorker.on("completed", async (job) => {
        if (job.name === "batch-update-active-users") {
          await this.batchUpdateActiveUsers();
        }
      });

      console.log("⏰ Scheduled periodic recommendation updates");
    } catch (error) {
      console.error("Failed to schedule periodic updates:", error);
    }
  }

  /**
   * Queue recommendation computation for a user
   */
  static async queueUserRecommendation(
    userId: number,
    priority: "high" | "normal" | "low" = "normal"
  ): Promise<void> {
    try {
      // Check if user already has cached recommendations
      const hasCached = await RecommendationService.hasCachedRecommendations(
        userId
      );

      if (hasCached && priority === "low") {
        // User already has recommendations, skip low priority update
        return;
      }

      const jobOptions: any = {
        priority: priority === "high" ? 1 : priority === "normal" ? 2 : 3,
      };

      // Deduplicate: only one job per user at a time
      jobOptions.jobId = `recommendation-${userId}`;

      await this.recommendationQueue.add(
        `compute-recommendation-user-${userId}`,
        { userId, priority },
        jobOptions
      );

      console.log(
        `📥 Queued recommendation job for user ${userId} (priority: ${priority})`
      );
    } catch (error) {
      console.error(
        `Failed to queue recommendation for user ${userId}:`,
        error
      );
    }
  }

  /**
   * Batch update recommendations for recently active users
   */
  private static async batchUpdateActiveUsers(): Promise<void> {
    try {
      console.log("🔄 Starting batch update for active users");

      // Get users who were active in the last 24 hours
      const activeCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Find users with recent activity
      const activeUsers = await query.user.findMany({
        where: {
          OR: [
            { updated_at: { gte: activeCutoff } },
            {
              PostLike: {
                some: { created_at: { gte: activeCutoff } },
              },
            },
            {
              PostComment: {
                some: { created_at: { gte: activeCutoff } },
              },
            },
          ],
          active_status: true,
        },
        select: { id: true },
        take: 500, // Limit to top 500 active users per batch
      });

      console.log(
        `📊 Found ${activeUsers.length} active users for batch update`
      );

      // Queue recommendations for each active user
      for (const user of activeUsers) {
        await this.queueUserRecommendation(user.id, "low");
      }

      console.log("✅ Batch update queued successfully");
    } catch (error) {
      console.error("❌ Error in batch update:", error);
    }
  }

  /**
   * Trigger immediate recommendation computation for a user (blocking)
   * Use this when user explicitly requests feed refresh
   */
  static async computeImmediately(userId: number): Promise<boolean> {
    try {
      console.log(`⚡ Immediate computation requested for user ${userId}`);
      return await RecommendationService.preComputeFeed(userId);
    } catch (error) {
      console.error(`Failed immediate computation for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    try {
      const [waiting, active, completed, failed] = await Promise.all([
        this.recommendationQueue.getWaitingCount(),
        this.recommendationQueue.getActiveCount(),
        this.recommendationQueue.getCompletedCount(),
        this.recommendationQueue.getFailedCount(),
      ]);

      return { waiting, active, completed, failed };
    } catch (error) {
      console.error("Failed to get queue stats:", error);
      return { waiting: 0, active: 0, completed: 0, failed: 0 };
    }
  }

  /**
   * Shutdown the worker gracefully
   */
  static async shutdown(): Promise<void> {
    try {
      console.log("🛑 Shutting down RecommendationWorkerService...");

      await this.recommendationWorker.close();
      await this.recommendationQueue.close();
      await this.queueEvents.close();

      this.isInitialized = false;
      console.log("✅ RecommendationWorkerService shut down successfully");
    } catch (error) {
      console.error(
        "❌ Error shutting down RecommendationWorkerService:",
        error
      );
    }
  }
}
