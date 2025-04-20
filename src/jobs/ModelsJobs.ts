// Queue setup
import { Queue, Worker } from "bullmq";
import { redis } from "@libs/RedisStore";
import TriggerModels from "@jobs/models";
import TriggerHookups from "@jobs/hookup";

// Create queue using the same Redis connection
const queue = new Queue("model-hookup-sync", { connection: redis });
let queueCount: number = 0;

// Create worker with the same Redis connection (outside the function)
const worker = new Worker(
  "model-hookup-sync",
  async (_) => {
    // Trigger Model Jobs
    await TriggerModels(1);
    await TriggerHookups(1);
  },
  { connection: redis }
);

async function ModelsJobs() {
  // Add a repeating job
  if (queueCount === 1) return;
  const job = await queue.add(
    "broadCastModelsAndHookups",
    {},
    {
      
      repeat: {
        every: 10000,
        immediately: true, // Run immediately after adding the job
      },
    }
  );
  queueCount += 1;
  console.log(`QueueCount`, queueCount);
  return job;
}

// Handle worker events
worker.on('completed', job => console.log(`Job ${job.name} completed`));
worker.on("failed", (job, err) =>
  console.error(`Job ${job?.id} failed withDirectives  error ${err}`)
);

export default ModelsJobs;
