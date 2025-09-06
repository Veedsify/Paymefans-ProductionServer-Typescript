import { redis } from "@libs/RedisStore";
import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import { Queue, Worker } from "bullmq";
import type { DatabaseOperationResult } from "types/socket";

interface MessagePointsJobData {
  sender_id: string;
  receiver_id: string;
  messageId: string;
}

const MessagePointsQueue = new Queue("messagePointsQueue", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: true,
    attempts: 3,
    backoff: 5000,
  },
});

const MessagePointsWorker = new Worker(
  "messagePointsQueue",
  async (job) => {
    const { sender_id, receiver_id, messageId } =
      job.data as MessagePointsJobData;

    try {
      const result = await removePointsFromUser(sender_id, receiver_id);

      if (!result.success) {
        console.error(
          "❌ Failed to process message points:",
          result.message,
          messageId,
        );
        throw new Error(result.message);
      }

      return result;
    } catch (err: any) {
      console.error(`Error processing message points: ${err.message}`);
      throw err;
    }
  },
  {
    connection: redis,
  },
);

// Remove points from user function moved from SaveMessageToDb
async function removePointsFromUser(
  sender_id: string,
  receiver_id: string,
): Promise<DatabaseOperationResult> {
  try {
    const sender = await query.user.findFirst({
      where: {
        user_id: sender_id,
      },
      select: {
        name: true,
        id: true,
        username: true,
        UserPoints: true,
        Settings: true,
        UserWallet: {
          select: {
            id: true,
            wallet_id: true,
            balance: true,
          },
        },
      },
    });

    const receiver = await query.user.findFirst({
      where: {
        user_id: receiver_id,
      },
      select: {
        name: true,
        id: true,
        username: true,
        Settings: true,
        UserWallet: {
          select: {
            id: true,
            wallet_id: true,
            balance: true,
          },
        },
      },
    });

    if (!sender || !receiver) {
      return {
        success: false,
        message: "User not found",
        error: "USERS_NOT_FOUND",
      };
    }

    // Check if both users have enabled free messages for each other
    const senderEnablesFreeMessages =
      sender?.Settings?.enable_free_message || false;
    const receiverEnablesFreeMessages =
      receiver?.Settings?.enable_free_message || false;

    // If both users enable free messages, skip point deduction
    if (senderEnablesFreeMessages && receiverEnablesFreeMessages) {
      console.log(
        "🆓 Free message enabled by both users - skipping point deduction",
      );
      return { success: true };
    }

    const receiverPrice = receiver?.Settings?.price_per_message || 0;

    // If receiver hasn't set a price, allow the message to go through
    if (receiverPrice === 0) {
      return { success: true };
    }

    const senderPoints = sender?.UserPoints?.points || 0;

    // Check if sender has enough points
    if (!sender?.UserPoints || senderPoints < receiverPrice) {
      return {
        success: false,
        message: `You have ${senderPoints} points but need ${receiverPrice} points to send this message`,
        error: "INSUFFICIENT_POINTS",
        currentPoints: senderPoints,
        requiredPoints: receiverPrice,
      };
    }

    // Update sender points (decrement)
    await query.user.update({
      where: {
        id: sender.id,
      },
      data: {
        UserPoints: {
          upsert: {
            create: {
              points: -receiverPrice,
              conversion_rate: 1.0,
            },
            update: {
              points: {
                decrement: receiverPrice,
              },
            },
          },
        },
      },
    });

    // Update receiver points (increment)
    await query.user.update({
      where: {
        id: receiver.id,
      },
      data: {
        UserPoints: {
          upsert: {
            create: {
              points: receiverPrice,
              conversion_rate: 1.0,
            },
            update: {
              points: {
                increment: receiverPrice,
              },
            },
          },
        },
      },
    });

    const purchase_id = `TRN${GenerateUniqueId()}`;
    const purchase_id2 = `TRN${GenerateUniqueId()}`;

    // Ensure sender has a wallet
    let senderWallet = sender?.UserWallet?.id;

    if (!senderWallet && sender?.id) {
      try {
        const newSenderWallet = await query.userWallet.create({
          data: {
            user_id: sender.id,
            wallet_id: `WALLET_${GenerateUniqueId()}`,
            balance: 0,
          },
        });
        senderWallet = newSenderWallet.id;
      } catch (error: any) {
        // If wallet already exists due to race condition, fetch it
        if (error.code === "P2002") {
          const existingWallet = await query.userWallet.findUnique({
            where: { user_id: sender.id },
            select: { id: true },
          });
          senderWallet = existingWallet?.id;
        } else {
          throw error;
        }
      }
    }

    // Ensure receiver has a wallet
    let receiverWallet = receiver?.UserWallet?.id;

    if (!receiverWallet && receiver?.id) {
      try {
        const newReceiverWallet = await query.userWallet.create({
          data: {
            user_id: receiver.id,
            wallet_id: `WALLET_${GenerateUniqueId()}`,
            balance: 0,
          },
        });
        receiverWallet = newReceiverWallet.id;
      } catch (error: any) {
        // If wallet already exists due to race condition, fetch it
        if (error.code === "P2002") {
          const existingWallet = await query.userWallet.findUnique({
            where: { user_id: receiver.id },
            select: { id: true },
          });
          receiverWallet = existingWallet?.id;
        } else {
          throw error;
        }
      }
    }

    if (receiverPrice > 0 && senderWallet && receiverWallet) {
      const optionsForSender = {
        transactionId: purchase_id,
        transaction: `Message to ${receiver?.username} with id ${receiver_id}`,
        userId: sender?.id,
        amount: receiverPrice,
        transactionType: "debit",
        transactionMessage: `Message to ${receiver?.username}`,
        walletId: senderWallet,
      };
      const optionsForReceiver = {
        transactionId: purchase_id2,
        transaction: `Message from ${sender?.username} with id ${sender_id}`,
        userId: receiver?.id,
        amount: receiverPrice,
        transactionType: "credit",
        transactionMessage: `Message from ${sender?.username}`,
        walletId: receiverWallet,
      };

      await Promise.all([
        UserTransactionQueue.add("userTransaction", optionsForSender, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserTransactionQueue.add("userTransaction", optionsForReceiver, {
          removeOnComplete: true,
          attempts: 3,
        }),
      ]);
    }

    return { success: true };
  } catch (error) {
    console.error("❌ Error in removePointsFromUser:", error);
    return {
      success: false,
      message: "An error occurred while processing the transaction",
      error: "TRANSACTION_ERROR",
    };
  }
}

MessagePointsWorker.on("completed", (job) => {
  console.log(`MessagePoints job ${job.id} completed!`);
});

MessagePointsWorker.on("failed", (job, err) => {
  console.error(
    `MessagePoints job ${job?.id} failed with error: ${err.message}`,
  );
});

export { MessagePointsQueue };
