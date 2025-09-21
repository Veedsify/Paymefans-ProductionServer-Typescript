import { Queue, Worker } from "bullmq"
import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import { Comments } from "@utils/mongoSchema";

const UpdateAvatarQueue = new Queue("updateAvatarQueue", {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: 5000,
    }
})

const UpdateAvatarWorker = new Worker("updateAvatarQueue", async (job) => {
    const { userId, avatarUrl } = job.data;
    // Here you would update the user's avatar in your database
    await Comments.updateMany({
        userId: userId
    }, {
        profile_image: avatarUrl
    })
}, {
    connection: redis,
})

UpdateAvatarWorker.on("completed", async (job) => {
    const logEntry = `${new Date().toISOString()} - Job ${job.id
        } completed - ${JSON.stringify(job.data)}`;
    await query.batchProcessLogs.create({
        data: {
            job_id: job.id as string,
            job_name: job.name,
            job_data: logEntry,
        },
    });
});
UpdateAvatarWorker.on("failed", (error: any) => {
    console.error(`Job failed with error: ${JSON.stringify(error)}`);
})

export { UpdateAvatarQueue, }