import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import sanitizeHtml from "sanitize-html";
import type { SaveMessageToDBProps } from "types/conversations";
import type { DatabaseOperationResult } from "types/socket";

class SaveMessageToDb {
  static async SaveMessage(data: SaveMessageToDBProps) {
    try {
      // Get the data from the message
      const {
        message_id,
        sender_id,
        receiver_id,
        conversationId,
        message,
        attachment = [],
        story_reply = null,
      } = data;

      // Debug: Log story reply data
      if (story_reply) {
        console.log("📖 Story reply data received:", story_reply);
      }

      const user = await query.user.findFirst({
        where: {
          user_id: sender_id,
        },
      });

      const checkCanUserSendFreeMessage = RBAC.checkUserFlag(
        user?.flags,
        Permissions.SEND_FREE_MESSAGES,
      );

      if (checkCanUserSendFreeMessage === false) {
        const pointsResult = await this.RemovePointsFromUser(
          sender_id,
          receiver_id,
        );
        // If points are not removed return an error with details
        if (pointsResult.success === false) {
          console.error(
            "❌ Failed to remove points from user - message sending aborted",
          );
          return pointsResult;
        }
      }

      // Get the receiver id
      const receiverId = await query.conversations.findFirst({
        where: {
          conversation_id: conversationId,
        },
        select: {
          participants: true,
        },
      });

      // Sanitize the message
      const sanitizedHtml = sanitizeHtml(message);
      // Destructure the participants for better readability
      const [participant1] = receiverId?.participants || [];
      // Ensure the participants are available
      if (!participant1) {
        throw new Error("Invalid participants data");
      }

      // Determine the receiver based on the sender_id
      const receiver =
        participant1.user_1 === sender_id
          ? participant1.user_2
          : participant1.user_1;

      // Process attachments with better video handling
      const modifiedAttachment = attachment.map((file: any) => {
        const baseAttachment = {
          ...file,
        };

        // Add poster for video files
        if (file.type === "video" && file.id) {
          baseAttachment.poster = `${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${file.id}/thumbnails/thumbnail.gif?time=1s&height=400&duration=4s`;
        }

        return baseAttachment;
      });

      // Save the message to the database
      const newMessage = await query.messages.create({
        data: {
          message_id: String(message_id),
          sender_id: sender_id,
          conversationsId: conversationId,
          message: sanitizedHtml,
          seen: false,
          receiver_id: receiver,
          attachment: modifiedAttachment,
          story_reply: story_reply as any,
        },
        select: {
          id: true,
          message_id: true,
          conversationsId: true,
          receiver: {
            select: {
              name: true,
              username: true,
              email: true,
            },
          },
        },
      });
      // Return the data
      return {
        error: false,
        ...newMessage,
      };
    } catch (error) {
      console.error("❌ Error in SaveMessage:", error);
      const err = error as Error;
      console.error("🔍 Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      return false;
    }
  }

  // Remove points from user
  static async RemovePointsFromUser(
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
        console.error("❌ Sender or receiver not found");
        return {
          success: false,
          message: "User not found",
          error: "USERS_NOT_FOUND",
        };
      }

      const receiverPrice = receiver?.Settings?.price_per_message || 0;

      // If receiver hasn't set a price, allow the message to go through
      if (receiverPrice === 0) {
        console.log("✅ Free message - no points required");
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
        console.log("📱 Creating wallet for sender...");
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
            console.log("📱 Wallet already exists for sender, fetching...");
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
        console.log("📱 Creating wallet for receiver...");
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
        console.log("✅ Transaction queue jobs added successfully");
      } else if (receiverPrice > 0) {
        console.warn("⚠️ Skipping transaction creation - missing wallet:", {
          receiverPrice,
          senderWallet: !!senderWallet,
          receiverWallet: !!receiverWallet,
        });
      }
      return { success: true };
    } catch (error) {
      console.error("❌ Error in RemovePointsFromUser:", error);
      const err = error as Error;
      console.error("🔍 Error details:", {
        name: err.name,
        message: err.message,
        stack: err.stack,
      });
      return {
        success: false,
        message: "An error occurred while processing the transaction",
        error: "TRANSACTION_ERROR",
      };
    }
  }
}

export default SaveMessageToDb;
