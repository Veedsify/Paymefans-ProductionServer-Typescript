import EmitActiveUsers from "@jobs/EmitActiveUsers";
import { redis } from "@libs/RedisStore";
import { Queue, Worker } from "bullmq";
import IoInstance from "@libs/io";

const activeUsersQueue = new Queue("activeUsersQueue", {
  connection: redis,
});

const pruneInactiveUsersQueue = new Queue("pruneInactiveUsersQueue", {
  connection: redis,
});

const pruneInactiveUsersWorker = new Worker(
  "pruneInactiveUsersQueue",
  async () => {
    const activeUsers = await redis.hgetall("activeUsers");
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [userKey, json] of Object.entries(activeUsers)) {
      try {
        const data = JSON.parse(json);
        // Increased timeout to 2 minutes to avoid premature disconnections
        if (now - data.last_active > 120000) {
          toDelete.push(userKey);
        }
      } catch {
        toDelete.push(userKey);
      }
    }

    if (toDelete.length > 0) {
      await redis.hdel("activeUsers", ...toDelete);
      // Emit updated active users list after cleanup
      const instance = await IoInstance.getIO();
      await EmitActiveUsers(instance);
      console.log(`Pruned ${toDelete.length} inactive users`);
    }
  },
  {
    connection: redis,
  },
);

const activeUsersWorker = new Worker(
  "activeUsersQueue",
  async (_) => {
    // Emit active users to the socket
    const instance = IoInstance.getIO();
    await EmitActiveUsers(instance);
  },
  {
    connection: redis,
  },
);

activeUsersWorker.on("completed", () => {
  // console.log(`Active users job completed: ${job.id}`);
});

pruneInactiveUsersWorker.on("completed", () => {
  // console.log(`Prune inactive users job completed: ${job.id}`);
});

export { activeUsersQueue, pruneInactiveUsersQueue };
