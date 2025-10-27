import {
  activeUsersQueue,
  pruneInactiveUsersQueue,
} from "@jobs/ActiveUserJobs";
import { deleteUserQueue } from "@jobs/DeleteAccountMedia";
import { pruneInactiveSubscribersQueue } from "@jobs/ModelSubscriberJobs";
import { schedulePostLikeSync } from "@jobs/PostLikeSyncJob";
import { CronJobService } from "@services/CronJobService";

async function InitializeQueueJobs() {
  // Initialize Cron Jobs
  CronJobService.initialize();

  // Initialize Post Like Sync Job
  await schedulePostLikeSync();

  // Emit active users to the socket - reduced frequency since we now use event-driven updates
  await activeUsersQueue.add(
    "activeUsersQueue",
    {},
    {
      repeat: {
        every: 30000, // 30 seconds - fallback for missed events
      },
      removeOnComplete: true,
      jobId: "activeUsersJob",
    }
  );
  // Prune inactive users
  await pruneInactiveUsersQueue.add(
    "pruneInactiveUsersQueue",
    {},
    {
      repeat: {
        every: 60000, // 1 minute
      },
      removeOnComplete: true,
      jobId: "pruneInactiveUsersJob",
    },
  );
  await pruneInactiveSubscribersQueue.add(
    "pruneInactiveSubscribersQueue",
    {},
    {
      repeat: {
        pattern: "0 0 */12 * * *", // Every 12 hours
      },
      removeOnComplete: true,
      jobId: "pruneInactiveSubscribersJob",
    },
  );

  // Delete users
  await deleteUserQueue.add(
    "deleteUserQueue",
    {},
    {
      repeat: {
        every: 1000 * 60 * 60 * 24, // 24 hours
      },
      jobId: "deleteUserJob",
    },
  );
}

export default InitializeQueueJobs;
