import { Job, Worker, Queue } from "bullmq";
import { redis } from "@libs/RedisStore";
import WelcomeMessageService from "@services/WelcomeMessageService";

export interface WelcomeMessageJobData {
  userId: number;
  userEmail: string;
  username: string;
  delay?: number; // in seconds
}

// Create the welcome message queue
export const WelcomeMessageQueue = new Queue("welcomeMessage", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs for monitoring
    removeOnFail: 50, // Keep last 50 failed jobs for debugging
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 2000,
    },
  },
});

// Create worker to process welcome messages
const welcomeMessageWorker = new Worker(
  "welcomeMessage",
  async (job: Job<WelcomeMessageJobData>) => {
    const { userId, userEmail, username } = job.data;

    try {
      const result = await WelcomeMessageService.sendWelcomeMessage({
        userId,
        userEmail,
        username,
      });

      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    } catch (error) {
      console.error(
        `Error processing welcome message job for user ${username}:`,
        error,
      );
      throw error;
    }
  },
  {
    connection: redis,
    concurrency: 10, // Process up to 10 welcome messages concurrently
  },
);

/**
 * Schedule a welcome message to be sent to a user
 */
export async function scheduleWelcomeMessage(
  data: WelcomeMessageJobData,
): Promise<void> {
  try {
    // Get welcome message configuration to determine delay
    const config = await WelcomeMessageService.getWelcomeConfig();

    if (!config || !config.enabled) {
      return;
    }

    const delay = data.delay !== undefined ? data.delay : config.delay;

    // Add job to queue with appropriate delay
    const jobOptions: any = {
      jobId: `welcome-${data.userId}-${Date.now()}`, // Unique job ID
    };

    if (delay > 0) {
      jobOptions.delay = delay * 1000; // Convert seconds to milliseconds
    }

    await WelcomeMessageQueue.add("sendWelcomeMessage", data, jobOptions);
  } catch (error) {
    console.error("Error scheduling welcome message:", error);
  }
}

/**
 * Send welcome message immediately (bypass delay)
 */
export async function sendWelcomeMessageImmediate(
  data: WelcomeMessageJobData,
): Promise<void> {
  try {
    await WelcomeMessageQueue.add(
      "sendWelcomeMessage",
      { ...data, delay: 0 },
      {
        jobId: `welcome-immediate-${data.userId}-${Date.now()}`,
        priority: 1, // High priority for immediate messages
      },
    );
  } catch (error) {
    console.error("Error sending immediate welcome message:", error);
  }
}

/**
 * Get welcome message queue statistics
 */
export async function getWelcomeMessageQueueStats() {
  try {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      WelcomeMessageQueue.getWaiting(),
      WelcomeMessageQueue.getActive(),
      WelcomeMessageQueue.getCompleted(),
      WelcomeMessageQueue.getFailed(),
      WelcomeMessageQueue.getDelayed(),
    ]);

    return {
      waiting: waiting.length,
      active: active.length,
      completed: completed.length,
      failed: failed.length,
      delayed: delayed.length,
      total:
        waiting.length +
        active.length +
        completed.length +
        failed.length +
        delayed.length,
    };
  } catch (error) {
    console.error("Error getting welcome message queue stats:", error);
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      total: 0,
    };
  }
}

// Handle worker events
welcomeMessageWorker.on("completed", (job) => {
  console.log(
    `Welcome message job ${job.id} completed for user ${job.data.username}`,
  );
});

welcomeMessageWorker.on("failed", (job, err) => {
  console.error(
    `Welcome message job ${job?.id} failed for user ${job?.data?.username}:`,
    err.message,
  );
});

welcomeMessageWorker.on("stalled", (jobId) => {
  console.warn(`Welcome message job ${jobId} stalled`);
});

welcomeMessageWorker.on("progress", (job, progress) => {
  console.log(`Welcome message job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down welcome message worker...");
  await welcomeMessageWorker.close();
});

process.on("SIGTERM", async () => {
  console.log("Shutting down welcome message worker...");
  await welcomeMessageWorker.close();
});

export { welcomeMessageWorker };
