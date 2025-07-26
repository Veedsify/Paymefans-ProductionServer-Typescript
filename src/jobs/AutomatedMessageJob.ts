import { Job, Worker, Queue } from "bullmq";
import { redis } from "@libs/RedisStore";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";

interface AutomatedMessageJobData {
    senderId: number;
    receiverId: number;
    messageType: "followers" | "subscribers";
    messageData: {
        text: string;
        attachments: any[];
    };
}

// Create the automated message queue
export const AutomatedMessageQueue = new Queue("automatedMessage", {
    connection: redis,
    defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 2000,
        },
    }
});

// Create worker to process automated messages
const automatedMessageWorker = new Worker(
    "automatedMessage",
    async (job: Job<AutomatedMessageJobData>) => {
        const { senderId, receiverId, messageType, messageData } = job.data;

        try {
            await sendAutomatedMessage(senderId, receiverId, messageData);
            console.log(`Automated ${messageType} message sent from user ${senderId} to user ${receiverId}`);
        } catch (error) {
            console.error("Error processing automated message job:", error);
            throw error;
        }
    },
    {
        connection: redis,
        concurrency: 5, // Process up to 5 messages concurrently
    }
);

/**
 * Helper function to send the actual automated message
 */
async function sendAutomatedMessage(
    senderId: number,
    receiverId: number,
    messageData: { text: string; attachments: any[] }
) {
    try {
        // Get user IDs as strings (assuming your system uses string user_ids)
        const senderUser = await query.user.findUnique({
            where: { id: senderId },
            select: { user_id: true }
        });

        const receiverUser = await query.user.findUnique({
            where: { id: receiverId },
            select: { user_id: true }
        });

        if (!senderUser || !receiverUser) {
            throw new Error("Could not find sender or receiver user");
        }

        const messageId = `MSG${GenerateUniqueId()}`;

        // Check if conversation exists between users
        const existingConversation = await query.participants.findFirst({
            where: {
                OR: [
                    {
                        user_1: senderUser.user_id,
                        user_2: receiverUser.user_id,
                    },
                    {
                        user_1: receiverUser.user_id,
                        user_2: senderUser.user_id,
                    },
                ],
            },
            include: {
                Conversations: true,
            },
        });

        let conversationId: string;

        if (existingConversation && existingConversation.Conversations.length > 0) {
            conversationId = existingConversation.Conversations[0].conversation_id;
        } else {
            // Create new conversation
            const newConversationId = `CONV${GenerateUniqueId()}`;

            // Create participants record
            const participants = await query.participants.create({
                data: {
                    user_1: senderUser.user_id,
                    user_2: receiverUser.user_id,
                },
            });

            // Create conversation record
            await query.conversations.create({
                data: {
                    conversation_id: newConversationId,
                    participants: {
                        connect: { id: participants.id },
                    },
                },
            });

            conversationId = newConversationId;
        }

        // Create the message
        await query.messages.create({
            data: {
                message_id: messageId,
                sender_id: senderUser.user_id,
                receiver_id: receiverUser.user_id,
                conversationsId: conversationId,
                message: messageData.text,
                attachment: messageData.attachments.length > 0 ? messageData.attachments : [],
                seen: false,
            },
        });

    } catch (error) {
        console.error("Error sending automated message:", error);
        throw error;
    }
}

// Handle worker events
automatedMessageWorker.on("completed", (job) => {
    console.log(`Automated message job ${job.id} completed`);
});

automatedMessageWorker.on("failed", (job, err) => {
    console.error(`Automated message job ${job?.id} failed:`, err);
});

automatedMessageWorker.on("stalled", (jobId) => {
    console.warn(`Automated message job ${jobId} stalled`);
});

export { automatedMessageWorker };