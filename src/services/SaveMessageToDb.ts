import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";
import sanitizeHtml from "sanitize-html";
import type { SaveMessageToDBProps } from "types/conversations";

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
            } = data;

            // Remove points from user
            const pointsRemoved = await this.RemovePointsFromUser(
                sender_id,
                receiver_id
            );

            // If points are not removed return an error
            if (pointsRemoved === false)
                return console.log("Error removing points from user");

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

            // Save the message to the database
            const newMessage = await query.messages.create({
                data: {
                    message_id: String(message_id),
                    sender_id: sender_id,
                    conversationsId: conversationId,
                    message: sanitizedHtml,
                    seen: false,
                    receiver_id: receiver,
                    attachment: attachment,
                },
                select: {
                    message_id: true,
                },
            });

            query.$disconnect();

            // Return the data
            return newMessage;
        } catch (error) {
            console.log(error);
            return false;
        }
    }

    // Remove points from user
    static async RemovePointsFromUser(sender_id: string, receiver_id: string) {
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

        if(!sender || !receiver) return false;

        const receiverPrice =
            receiver?.Settings
                ? receiver.Settings.price_per_message
                : 0;

        if (sender?.UserPoints && (sender.UserPoints.points < receiverPrice)) return false;

        await query.user.update({
            where: {
                user_id: sender_id,
            },
            data: {
                UserPoints: {
                    update: {
                        points: {
                            decrement: receiverPrice,
                        },
                    },
                },
            },
        });

        await query.user.update({
            where: {
                user_id: receiver_id,
            },
            data: {
                UserPoints: {
                    update: {
                        points: {
                            increment: receiverPrice,
                        },
                    },
                },
            },
        });

        const purchase_id = `TRN${GenerateUniqueId()}`
        const purchase_id2 = `TRN${GenerateUniqueId()}`

        if (receiverPrice > 0) {
            await query.userTransaction.create({
                data: {
                    transaction_id: purchase_id,
                    transaction: `Message to ${receiver?.username} with id ${receiver_id}`,
                    user_id: sender?.id,
                    amount: receiverPrice,
                    transaction_type: "debit",
                    transaction_message: `Message to ${receiver?.username}`,
                    wallet_id: sender?.UserWallet[0].id,
                } as any,
            });
            await query.userTransaction.create({
                data: {
                    transaction: `Message from ${sender?.username} with id ${sender_id}`,
                    transaction_id: purchase_id2,
                    user_id: receiver?.id,
                    amount: receiverPrice,
                    transaction_type: "credit",
                    transaction_message: `Message from ${sender?.username}`,
                    wallet_id: receiver?.UserWallet[0].id,
                } as any,
            });
        }

        return true;
    }
}

export default SaveMessageToDb;
