import { redis } from "@libs/RedisStore"
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq"

const pruneInactiveSubscribersQueue = new Queue("pruneInactiveSubscribersQueue", {
    connection: redis,
});


const pruneInactiveSubscribersWorker = new Worker(
    "pruneInactiveSubscribersQueue",
    async () => {
        const expiredSubscriptions = await query.userSubscriptionCurrent.findMany({
            where: {
                ends_at: {
                    lt: Date.now(),
                }
            },
            select: {
                user_id: true
            }
        });


        if (expiredSubscriptions.length === 0) return;

        const expiredUserIds = expiredSubscriptions.map(sub => sub.user_id);

        const [updatedSubscribers] = await Promise.all([
            query.subscribers.updateMany({
                where: {
                    subscriber_id: {
                        in: expiredUserIds,
                    }
                },
                data: {
                    status: "inactive"
                }
            }),
            query.userSubscriptionCurrent.deleteMany({
                where: {
                    user_id: {
                        in: expiredUserIds,
                    }
                }
            })
        ]);

        if (updatedSubscribers.count > 0) {
            console.log(`Pruned ${updatedSubscribers.count} inactive subscribers`);
        }
    },
    {
        connection: redis,
    }
);

pruneInactiveSubscribersWorker.on("completed", (job) => {
    console.log(`Job ${job.id} completed successfully`);
})


export { pruneInactiveSubscribersQueue,  };