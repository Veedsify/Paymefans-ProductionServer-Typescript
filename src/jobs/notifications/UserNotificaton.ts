import {redis} from "@libs/RedisStore";
import query from "@utils/prisma";
import {Queue, Worker} from "bullmq";

const UserNotificationQueue = new Queue("userNotificationQueue", {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        attempts: 3,
        backoff: 5000,
    }
});

const UserNotificationWorker = new Worker(
    "userNotificationQueue",
    async (job) => {
        const {
            user_id,
            url,
            message,
            action,
            notification_id,
            read,
        } = job.data;
        try {
            await query.notifications.create({
                data: {
                    user_id,
                    url,
                    message,
                    action,
                    notification_id,
                    read,
                },
            });
        } catch (err: any) {
            console.error(`Error creating user transaction: ${err.message}`);
            throw err;
        }
    },
    {
        connection: redis,
    }
);

UserNotificationWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed!`);
});

UserNotificationWorker.on("failed", (job, err) => {
    console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

export {UserNotificationQueue};
