import { redis } from "@libs/RedisStore";
import RemoveCloudflareMedia from "@libs/RemoveCloudflareMedia";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";

const deleteUserQueue = new Queue("deleteUserQueue", {
    connection: redis
});

const deleteAccountWorker = new Worker(
    "deleteUserQueue",
    async () => {
        const usersTodelete = await query.user.findMany({
            where: {
                should_delete: true,
                delete_date: {
                    lte: new Date()
                },
            },
            select: {
                id: true,
            }
        });

        if (usersTodelete.length === 0) {
            console.log("No users to delete media for.");
            return;
        }

        const userIds = usersTodelete.map((user) => user.id);

        // Remove media for all users in parallel
        const allUserMedia = await query.userMedia.findMany({
            where: {
                user_id: { in: userIds },
            },
            select: {
                media_id: true,
                media_type: true,
            }
        });

        if (allUserMedia.length > 0) {
            await RemoveCloudflareMedia(allUserMedia.map((m) => ({
                id: m.media_id,
                type: m.media_type,
            })));
        }

        // Delete user data in a single transaction
        await query.$transaction([
            query.userMedia.deleteMany({ where: { user_id: { in: userIds } } }),
            query.user.deleteMany({ where: { id: { in: userIds } } }),
            query.follow.deleteMany({ where: { OR: [{ user_id: { in: userIds } }, { follower_id: { in: userIds } }] } }),
            query.subscribers.deleteMany({ where: { user_id: { in: userIds } } }),
            query.userPoints.deleteMany({ where: { user_id: { in: userIds } } }),
            query.userWallet.deleteMany({ where: { user_id: { in: userIds } } }),
            query.settings.deleteMany({ where: { id: { in: userIds } } }),
        ]);

    },
    {
        connection: redis,
    }
);

deleteAccountWorker.on("completed", (job) => {
    console.log(`Delete account media job completed: ${job.id}`);
});

export { deleteUserQueue, deleteAccountWorker };