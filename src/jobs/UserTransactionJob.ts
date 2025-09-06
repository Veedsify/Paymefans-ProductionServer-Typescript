import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";

const UserTransactionQueue = new Queue("userTransactionQueue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: 5000,
  },
});

const UserTransactionWorker = new Worker(
  "userTransactionQueue",
  async (job) => {
    const {
      transactionId,
      transaction,
      userId,
      amount,
      transactionType,
      transactionMessage,
      walletId,
    } = job.data;
    try {
      // Only create transaction if walletId is provided
      if (!walletId) {
        console.warn(
          `Skipping transaction creation - no wallet ID provided for user ${userId}`,
        );
        return;
      }

      await query.userTransaction.create({
        data: {
          transaction_id: transactionId,
          transaction,
          user: {
            connect: { id: userId },
          },
          UserWallet: {
            connect: { id: walletId },
          },
          amount,
          transaction_type: transactionType,
          transaction_message: transactionMessage,
        },
      });
    } catch (err: any) {
      console.error(`Error creating user transaction: ${err.message}`);
      throw err;
    }
  },
  {
    connection: redis,
  },
);

UserTransactionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

UserTransactionWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

export { UserTransactionQueue };
