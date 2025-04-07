// Queue setup
import {Queue, Worker} from 'bullmq';
import {redis} from "@libs/RedisStore";

// Create queue using the same Redis connection
const queue = new Queue('analytics-sync', {connection: redis});
let queueCount: number = 0;

// Create worker with the same Redis connection (outside the function)
const worker = new Worker('analytics-sync', async (job) => {
   
}, {connection: redis});

async function AnalyticsQueue() {
    // Add a repeating job
    if (queueCount === 1) return
    const job = await queue.add('syncAnalytics', {}, {
        repeat: {every: 300} // 5 mins (50000ms)
    });
    queueCount += 1
    console.log(`QueueCount`, queueCount);
    return job;
}

// Handle worker events
worker.on('completed', job => console.log(`Job ${job.name} completed`));
worker.on('failed', (job, err) => console.error(`Job ${job?.id} failed with error ${err}`));

export default AnalyticsQueue;