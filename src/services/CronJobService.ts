import { Queue, Worker, QueueEvents } from "bullmq";
import { redis } from "@libs/RedisStore";
import CartService from "./CartService";

interface JobData {
  type: "cleanup" | "daily-cleanup";
}

export class CronJobService {
  private static cleanupQueue: Queue<JobData>;
  private static cleanupWorker: Worker<JobData>;
  private static queueEvents: QueueEvents;
  private static isInitialized = false;

  static initialize(): void {
    if (this.isInitialized) {
      console.log("Cron jobs already initialized");
      return;
    }

    this.setupQueue();
    this.setupWorker();
    this.setupQueueEvents();
    this.setupCleanupJob();
    this.setupDailyCleanup();

    this.isInitialized = true;
    console.log("BullMQ cron jobs initialized successfully");
  }

  private static setupQueue(): void {
    this.cleanupQueue = new Queue<JobData>("cleanup-queue", {
      connection: redis,
      defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      },
    });
  }

  private static setupWorker(): void {
    this.cleanupWorker = new Worker<JobData>(
      "cleanup-queue",
      async (job) => {
        const { type } = job.data;

        try {
          console.log(`Running ${type} of expired checkouts...`);
          await CartService.AutoCleanupExpiredCheckouts();
          console.log(`${type} completed successfully`);
        } catch (error) {
          console.error(`Error in ${type}:`, error);
          throw error;
        }
      },
      {
        connection: redis,
        concurrency: 1,
      },
    );

    this.cleanupWorker.on("completed", (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });

    this.cleanupWorker.on("failed", (job, err) => {
      console.error(`Job ${job?.id} failed:`, err);
    });
  }

  private static setupQueueEvents(): void {
    this.queueEvents = new QueueEvents("cleanup-queue", {
      connection: redis,
    });

    this.queueEvents.on("waiting", ({ jobId }) => {
      console.log(`Job ${jobId} is waiting`);
    });

    this.queueEvents.on("active", ({ jobId }) => {
      console.log(`Job ${jobId} is now active`);
    });

    this.queueEvents.on("completed", ({ jobId }) => {
      console.log(`Job ${jobId} has completed`);
    });

    this.queueEvents.on("failed", ({ jobId, failedReason }) => {
      console.log(`Job ${jobId} has failed with reason: ${failedReason}`);
    });
  }

  // Run cleanup every 30 minutes
  private static async setupCleanupJob(): Promise<void> {
    try {
      // Remove existing repeatable job if any
      await this.cleanupQueue.removeRepeatableByKey("cleanup-every-30-min");

      // Add new repeatable job
      await this.cleanupQueue.add(
        "cleanup-job",
        { type: "cleanup" },
        {
          repeat: {
            pattern: "*/30 * * * *", // Every 30 minutes
          },
          jobId: "cleanup-every-30-min",
        },
      );

      console.log(
        "Scheduled cleanup job set to run every 30 minutes using BullMQ",
      );
    } catch (error) {
      console.error("Error setting up cleanup job:", error);
    }
  }

  // Daily cleanup at 2 AM
  static async setupDailyCleanup(): Promise<void> {
    try {
      // Remove existing repeatable job if any
      await this.cleanupQueue.removeRepeatableByKey("daily-cleanup-2am");

      // Add new repeatable job
      await this.cleanupQueue.add(
        "daily-cleanup-job",
        { type: "daily-cleanup" },
        {
          repeat: {
            pattern: "0 2 * * *", // Daily at 2:00 AM
          },
          jobId: "daily-cleanup-2am",
        },
      );

      console.log("Daily cleanup job set to run at 2:00 AM using BullMQ");
    } catch (error) {
      console.error("Error setting up daily cleanup job:", error);
    }
  }

  // Manual cleanup trigger (for testing or manual runs)
  static async runCleanupNow(): Promise<void> {
    try {
      console.log("Adding manual cleanup job to queue...");
      const job = await this.cleanupQueue.add(
        "manual-cleanup",
        { type: "cleanup" },
        {
          priority: 1, // High priority for manual jobs
        },
      );

      console.log(`Manual cleanup job added with ID: ${job.id}`);

      // Wait for the job to complete
      await job.waitUntilFinished(this.queueEvents);
      console.log("Manual cleanup completed");
    } catch (error) {
      console.error("Error in manual cleanup:", error);
      throw error;
    }
  }

  // Get queue statistics
  static async getQueueStats(): Promise<any> {
    try {
      const waiting = await this.cleanupQueue.getWaiting();
      const active = await this.cleanupQueue.getActive();
      const completed = await this.cleanupQueue.getCompleted();
      const failed = await this.cleanupQueue.getFailed();
      const delayed = await this.cleanupQueue.getDelayed();
      const repeatableJobs = await this.cleanupQueue.getRepeatableJobs();

      return {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
        delayed: delayed.length,
        repeatableJobs: repeatableJobs.length,
      };
    } catch (error) {
      console.error("Error getting queue stats:", error);
      return null;
    }
  }

  // Pause queue
  static async pauseQueue(): Promise<void> {
    try {
      await this.cleanupQueue.pause();
      console.log("Cleanup queue paused");
    } catch (error) {
      console.error("Error pausing queue:", error);
    }
  }

  // Resume queue
  static async resumeQueue(): Promise<void> {
    try {
      await this.cleanupQueue.resume();
      console.log("Cleanup queue resumed");
    } catch (error) {
      console.error("Error resuming queue:", error);
    }
  }

  // Stop all jobs and close connections (useful for testing or graceful shutdown)
  static async destroy(): Promise<void> {
    try {
      if (this.cleanupWorker) {
        await this.cleanupWorker.close();
      }

      if (this.queueEvents) {
        await this.queueEvents.close();
      }

      if (this.cleanupQueue) {
        await this.cleanupQueue.close();
      }

      this.isInitialized = false;
      console.log("All BullMQ jobs stopped and connections closed");
    } catch (error) {
      console.error("Error destroying CronJobService:", error);
    }
  }

  // Clean up completed and failed jobs
  static async cleanQueue(): Promise<void> {
    try {
      await this.cleanupQueue.clean(24 * 60 * 60 * 1000, 10, "completed"); // Clean completed jobs older than 24 hours
      await this.cleanupQueue.clean(24 * 60 * 60 * 1000, 5, "failed"); // Clean failed jobs older than 24 hours
      console.log("Queue cleaned successfully");
    } catch (error) {
      console.error("Error cleaning queue:", error);
    }
  }
}
