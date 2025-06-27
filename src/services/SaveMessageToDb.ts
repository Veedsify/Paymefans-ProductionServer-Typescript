import { UserTransactionQueue } from "@jobs/notifications/UserTransactionJob";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import sanitizeHtml from "sanitize-html";
import type { SaveMessageToDBProps } from "types/conversations";
import type { DatabaseOperationResult } from "types/socket";

class SaveMessageToDb {
  static async SaveMessage(data: SaveMessageToDBProps) {
    try {
      console.log("📝 SaveMessage called with data:", {
        message_id: data.message_id,
        sender_id: data.sender_id,
        receiver_id: data.receiver_id,
        conversationId: data.conversationId,
        hasAttachment: (data.attachment?.length || 0) > 0,
      });

      // Get the data from the message
      const {
        message_id,
        sender_id,
        receiver_id,
        conversationId,
        message,
        attachment = [],
      } = data;

      // Remove points from user
      console.log("💰 Attempting to remove points from user...");
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
      console.log("✅ Points successfully processed");

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

      const modifiedAttachment = attachment.map((file: any) => ({
        ...file,
        poster: `${process.env.CLOUDFLARE_CUSTOMER_SUBDOMAIN}/${file.id}/thumbnails/thumbnail.gif?time=1s&height=400&duration=4s`,
      }));
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

      query.$disconnect();

      console.log("✅ Message successfully saved to database:", {
        messageId: newMessage.message_id,
        conversationId: newMessage.conversationsId,
      });

      // Return the data
      return newMessage;
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
      console.log("🔍 RemovePointsFromUser called:", {
        sender_id,
        receiver_id,
      });

      const sender = await query.user.findFirst({
        where: {
          user_id: sender_id,
        },
        select: {
          name: true,
          id: true,
          username: true,
          UserPoints: true,
          UserWallet: true,
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
          UserWallet: true,
        },
      });

      console.log("👤 Sender found:", {
        exists: !!sender,
        username: sender?.username,
        hasUserPoints: !!sender?.UserPoints,
        currentPoints: sender?.UserPoints?.points,
      });

      console.log("👤 Receiver found:", {
        exists: !!receiver,
        username: receiver?.username,
        hasSettings: !!receiver?.Settings,
        pricePerMessage: receiver?.Settings?.price_per_message,
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
      console.log("💰 Message price:", receiverPrice);

      // If receiver hasn't set a price, allow the message to go through
      if (receiverPrice === 0) {
        console.log("✅ Free message - no points required");
        return { success: true };
      }

      const senderPoints = sender?.UserPoints?.points || 0;

      // Check if sender has enough points
      if (!sender?.UserPoints || senderPoints < receiverPrice) {
        console.error("❌ Insufficient points:", {
          senderPoints,
          requiredPoints: receiverPrice,
        });
        return {
          success: false,
          message: `You have ${senderPoints} points but need ${receiverPrice} points to send this message`,
          error: "INSUFFICIENT_POINTS",
          currentPoints: senderPoints,
          requiredPoints: receiverPrice,
        };
      }

      console.log("💰 Processing point transaction...");

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
      const senderWallet =
        sender?.UserWallet && Array.isArray(sender.UserWallet)
          ? sender.UserWallet[0]?.id
          : undefined;
      const receiverWallet =
        receiver?.UserWallet && Array.isArray(receiver.UserWallet)
          ? receiver.UserWallet[0]?.id
          : undefined;

      if (receiverPrice > 0) {
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

      console.log("✅ Point transaction completed successfully");
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
