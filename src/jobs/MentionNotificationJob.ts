import { Job, Worker, Queue } from "bullmq";
import { redis } from "@libs/RedisStore";
import type { MentionJobData } from "../types/notifications";
import { MentionService } from "@services/MentionService";

// Create the mention notification queue
export const MentionNotificationQueue = new Queue("mentionNotification", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    removeOnFail: true,
  },
});

// Create worker to process mention notifications
const mentionWorker = new Worker(
  "mentionNotification",
  async (job: Job<MentionJobData>) => {
    const { mentions, mentioner, type, contentId, content, contentOwnerId } = job.data;

    try {
      await MentionService.processMentions({
        mentions,
        mentioner,
        type,
        contentId,
        content,
        contentOwnerId,
      });
    } catch (error) {
      console.error("Error processing mention notifications:", error);
      throw error;
    }
  },
  {
    connection: redis,
  },
);

mentionWorker.on("completed", (job) => {
  console.log(`Mention notification job ${job.id} completed`);
});

mentionWorker.on("failed", (job, err) => {
  console.error(`Mention notification job ${job?.id} failed:`, err);
});

export { mentionWorker };
