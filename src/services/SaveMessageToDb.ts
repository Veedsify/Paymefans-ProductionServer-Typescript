import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import sanitizeHtml from "sanitize-html";
import type { SaveMessageToDBProps } from "types/conversations";
import type { DatabaseOperationResult } from "types/socket";

class SaveMessageToDb {
  static async SaveMessage(data: SaveMessageToDBProps) {
    const {
      message_id,
      sender_id,
      conversationId,
      message,
      attachment = [],
      story_reply = null,
    } = data;

    try {
      const [sender, conversation] = await Promise.all([
        query.user.findFirst({
          where: { user_id: sender_id },
          select: {
            id: true,
            user_id: true,
            flags: true,
            UserPoints: { select: { points: true } },
            UserWallet: { select: { id: true, wallet_id: true, balance: true } },
          },
        }),
        query.conversations.findFirst({
          where: { conversation_id: conversationId },
          select: { participants: { select: { user_1: true, user_2: true } } },
        }),
      ]);

      if (!sender || !conversation || !conversation.participants.length) {
        throw new Error("Invalid sender or conversation data");
      }

      const participant = conversation.participants[0];
      const actualReceiverId =
        participant.user_1 === sender_id ? participant.user_2 : participant.user_1;

      const checkCanUserSendFreeMessage = RBAC.checkUserFlag(
        sender.flags,
        Permissions.SEND_FREE_MESSAGES
      );

      if (!checkCanUserSendFreeMessage) {
        const pointsResult = await this.RemovePointsFromUser(sender_id, actualReceiverId, conversationId);
        if (!pointsResult.success) {
          console.error("❌ Failed to remove points from user - message sending aborted");
          return pointsResult;
        }
      }

      const sanitizedMessage = sanitizeHtml(message);

      const modifiedAttachment = attachment.map((file: any) => ({
        ...file,
        ...(file.type === "video" && file.id
          ? {
            poster: `${process.env.CLOUDFLARE_CUSTOMER_DOMAIN}/${file.id}/thumbnails/thumbnail.gif?time=1s&height=400&duration=4s`,
          }
          : {}),
      }));

      const newMessage = await query.messages.create({
        data: {
          message_id: String(message_id),
          sender_id,
          conversationsId: conversationId,
          message: sanitizedMessage,
          seen: false,
          receiver_id: actualReceiverId,
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

      return {
        error: false,
        ...newMessage,
      };
    } catch (error) {
      console.error("❌ Error in SaveMessage:", error);
      return {
        success: false,
        message: "Failed to save message",
        error: "SAVE_MESSAGE_ERROR",
      };
    }
  }

  static async RemovePointsFromUser(
    sender_id: string,
    receiver_id: string,
    conversationId: string
  ): Promise<DatabaseOperationResult> {
    try {
      const [sender, receiver] = await Promise.all([
        query.user.findUnique({
          where: { user_id: sender_id },
          include: {
            UserPoints: true,
            UserWallet: true,
            Settings: true,
          },
        }),
        query.user.findUnique({
          where: { user_id: receiver_id },
          include: {
            UserPoints: true,
            UserWallet: true,
            Settings: true,
          },
        }),
      ]);

      if (!sender || !receiver) {
        return {
          success: false,
          message: "User not found",
          error: "USERS_NOT_FOUND",
        };
      }

      // Check if both users have enabled free messages for this conversation
      const freeMessageSettings = await query.conversationFreeMessage.findMany({
        where: {
          conversation_id: conversationId,
          user: {
            user_id: { in: [sender_id, receiver_id] },
          },
        },
        include: {
          user: { select: { user_id: true } },
        },
      });

      const bothEnabledFreeMessages =
        freeMessageSettings.filter((s) => s.enabled).length === 2;

      if (bothEnabledFreeMessages) {
        return { success: true };
      }

      const pricePerMessage = receiver.Settings?.price_per_message || 0;

      if (pricePerMessage === 0) {
        return { success: true };
      }

      const senderPoints = sender.UserPoints?.points ?? 0;

      if (senderPoints < pricePerMessage) {
        return {
          success: false,
          message: `You have ${senderPoints} points but need ${pricePerMessage} points to send this message`,
          error: "INSUFFICIENT_POINTS",
          currentPoints: senderPoints,
          requiredPoints: pricePerMessage,
        };
      }

      // Use Prisma transaction for atomic operations
      await query.$transaction([
        // Deduct points from sender
        query.user.update({
          where: { id: sender.id },
          data: {
            UserPoints: {
              upsert: {
                create: { points: -pricePerMessage, conversion_rate: 1.0 },
                update: { points: { decrement: pricePerMessage } },
              },
            },
          },
        }),
        // Add points to receiver
        query.user.update({
          where: { id: receiver.id },
          data: {
            UserPoints: {
              upsert: {
                create: { points: pricePerMessage, conversion_rate: 1.0 },
                update: { points: { increment: pricePerMessage } },
              },
            },
          },
        }),
      ]);

      // Ensure wallets exist
      let senderWallet = sender.UserWallet;
      let receiverWallet = receiver.UserWallet;

      if (!senderWallet) {
        try {
          senderWallet = await query.userWallet.create({
            data: {
              user_id: sender.id,
              wallet_id: `WALLET_${GenerateUniqueId()}`,
              balance: 0,
            },
          });
        } catch (error: any) {
          if (error.code === "P2002") {
            senderWallet = await query.userWallet.findUnique({
              where: { user_id: sender.id },
            });
          } else {
            throw error;
          }
        }
      }

      if (!receiverWallet) {
        try {
          receiverWallet = await query.userWallet.create({
            data: {
              user_id: receiver.id,
              wallet_id: `WALLET_${GenerateUniqueId()}`,
              balance: 0,
            },
          });
        } catch (error: any) {
          if (error.code === "P2002") {
            receiverWallet = await query.userWallet.findUnique({
              where: { user_id: receiver.id },
            });
          } else {
            throw error;
          }
        }
      }

      const purchase_id = `TRN${GenerateUniqueId()}`;
      const purchase_id2 = `TRN${GenerateUniqueId()}`;

      const optionsForSender = {
        transactionId: purchase_id,
        transaction: `Message to ${receiver.username} with id ${receiver_id}`,
        userId: sender.id,
        amount: pricePerMessage,
        transactionType: "debit",
        transactionMessage: `Message to ${receiver.username}`,
        walletId: senderWallet?.id,
      };

      const optionsForReceiver = {
        transactionId: purchase_id2,
        transaction: `Message from ${sender.username} with id ${sender_id}`,
        userId: receiver.id,
        amount: pricePerMessage,
        transactionType: "credit",
        transactionMessage: `Message from ${sender.username}`,
        walletId: receiverWallet?.id,
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

      return { success: true };
    } catch (error) {
      console.error("❌ Transaction error:", error);
      return {
        success: false,
        message: "An error occurred while processing the transaction",
        error: "TRANSACTION_ERROR",
      };
    }
  }
}

export default SaveMessageToDb;