import { redis } from "@libs/RedisStore";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";

const UserTransactionQueue = new Queue("userTransactionQueue", {
  connection: redis,
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
      await query.userTransaction.create({
        data: {
          transaction_id: transactionId,
          transaction,
          user_id: userId,
          amount,
          transaction_type: transactionType,
          transaction_message: transactionMessage,
          wallet_id: walletId,
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

UserTransactionWorker.on("completed", (job) => {
  console.log(`Job ${job.id} completed!`);
});

UserTransactionWorker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});

export { UserTransactionQueue };
