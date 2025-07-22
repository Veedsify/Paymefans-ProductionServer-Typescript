// Queue setup
import { Queue, Worker } from "bullmq";
import { redis } from "@libs/RedisStore";

// Create queue using the same Redis connection
const queue = new Queue("model-hookup-sync", {
    connection: redis, defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: 5000,
    }
});

let queueCount: number = 0;

// Create worker with the same Redis connection (outside the function)
const worker = new Worker(
    "model-hookup-sync",
    async (_) => {
        // Trigger Model Jobs
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
            removeOnComplete: true,
            repeat: {
                every: 3000, // 3 seconds
                immediately: true, // Run immediately after adding the job
            },
        }
    );
    queueCount += 1;
    return job;
}

// Handle worker events
// worker.on('completed', job => console.log(`Job ${job.name} completed`));
worker.on("failed", (job, err) =>
    console.error(`Job ${job?.id} failed withDirectives  error ${err}`)
);

export default ModelsJobs;
