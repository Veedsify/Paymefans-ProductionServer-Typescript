import AutomatedMessageService from "./AutomatedMessageService";
import { AutomatedMessageQueue } from "@jobs/AutomatedMessageJob";

export default class AutomatedMessageTriggerService {
    /**
     * Send automated message when a user follows another user
     */
    static async sendFollowerMessage(followedUserId: number, newFollowerId: number) {
        try {
            // Get the automated message for followers
            const automatedMessage = await AutomatedMessageService.getAutomatedMessageByType(
                followedUserId,
                "followers"
            );

            if (!automatedMessage) {
                return; // No automated message configured or not active
            }

            // Queue the message for processing
            await AutomatedMessageQueue.add(
                "sendFollowerMessage",
                {
                    senderId: followedUserId,
                    receiverId: newFollowerId,
                    messageType: "followers",
                    messageData: automatedMessage,
                },
                {
                    delay: 1000, // Small delay to ensure the follow action is completed
                }
            );

            // console.log(`Queued follower automated message from ${followedUserId} to ${newFollowerId}`);
        } catch (error) {
            console.error("Error queuing follower automated message:", error);
        }
    }

    /**
     * Send automated message when a user subscribes to another user
     */
    static async sendSubscriberMessage(subscribedToUserId: number, newSubscriberId: number) {
        try {
            // Get the automated message for subscribers
            const automatedMessage = await AutomatedMessageService.getAutomatedMessageByType(
                subscribedToUserId,
                "subscribers"
            );

            if (!automatedMessage) {
                return; // No automated message configured or not active
            }

            // Queue the message for processing
            await AutomatedMessageQueue.add(
                "sendSubscriberMessage",
                {
                    senderId: subscribedToUserId,
                    receiverId: newSubscriberId,
                    messageType: "subscribers",
                    messageData: automatedMessage,
                },
                {
                    delay: 1000, // Small delay to ensure the subscription action is completed
                }
            );

            // console.log(`Queued subscriber automated message from ${subscribedToUserId} to ${newSubscriberId}`);
        } catch (error) {
            console.error("Error queuing subscriber automated message:", error);
        }
    }


}

