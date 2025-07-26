import { PrismaClient } from "@prisma/client";
import type { AuthUser } from "types/user";

const prisma = new PrismaClient();

// Helper function to safely parse attachments from database
const parseAttachments = (attachments: any): Attachment[] => {
    if (!Array.isArray(attachments)) {
        return [];
    }

    return attachments.filter((att: any) => {
        return (
            typeof att === "object" &&
            typeof att.id === "string" &&
            typeof att.name === "string" &&
            typeof att.url === "string" &&
            typeof att.size === "number" &&
            typeof att.extension === "string" &&
            (att.type === "image" || att.type === "video")
        );
    }) as Attachment[];
};

interface Attachment {
    type: "image" | "video";
    extension: string;
    id: string;
    poster?: string;
    size: number;
    name: string;
    url: string;
}

interface AutomatedMessageData {
    followers?: {
        text: string;
        attachments: Attachment[];
        isActive: boolean;
    };
    subscribers?: {
        text: string;
        attachments: Attachment[];
        isActive: boolean;
    };
}

export default class AutomatedMessageService {
    static async getAutomatedMessages(userId: number) {
        try {
            const messages = await prisma.automatedMessage.findMany({
                where: { user_id: userId },
            });

            const result: {
                followers: {
                    text: string;
                    attachments: Attachment[];
                    isActive: boolean;
                };
                subscribers: {
                    text: string;
                    attachments: Attachment[];
                    isActive: boolean;
                };
            } = {
                followers: {
                    text: "",
                    attachments: [],
                    isActive: false,
                },
                subscribers: {
                    text: "",
                    attachments: [],
                    isActive: false,
                },
            };

            messages.forEach((message) => {
                const attachments = parseAttachments(message.attachments);

                if (message.message_type === "followers") {
                    result.followers = {
                        text: message.message_text || "",
                        attachments,
                        isActive: message.is_active,
                    };
                } else if (message.message_type === "subscribers") {
                    result.subscribers = {
                        text: message.message_text || "",
                        attachments,
                        isActive: message.is_active,
                    };
                }
            });

            return {
                status: true,
                error: false,
                message: "Automated messages retrieved successfully",
                data: result,
            };
        } catch (error: any) {
            console.error("Error getting automated messages:", error);
            return {
                status: false,
                error: true,
                message: "Failed to retrieve automated messages",
            };
        }
    }

    static async updateAutomatedMessages(data: AutomatedMessageData, user: AuthUser) {
        try {
            const updates = [];

            // Handle followers message
            if (data.followers) {
                const followersUpdate = prisma.automatedMessage.upsert({
                    where: {
                        user_id_message_type: {
                            user_id: user.id,
                            message_type: "followers",
                        },
                    },
                    update: {
                        message_text: data.followers.text,
                        attachments: data.followers.attachments as any,
                        is_active: data.followers.isActive,
                        updated_at: new Date(),
                    },
                    create: {
                        user_id: user.id,
                        message_type: "followers",
                        message_text: data.followers.text,
                        attachments: data.followers.attachments as any,
                        is_active: data.followers.isActive,
                    },
                });
                updates.push(followersUpdate);
            }

            // Handle subscribers message
            if (data.subscribers) {
                const subscribersUpdate = prisma.automatedMessage.upsert({
                    where: {
                        user_id_message_type: {
                            user_id: user.id,
                            message_type: "subscribers",
                        },
                    },
                    update: {
                        message_text: data.subscribers.text,
                        attachments: data.subscribers.attachments as any,
                        is_active: data.subscribers.isActive,
                        updated_at: new Date(),
                    },
                    create: {
                        user_id: user.id,
                        message_type: "subscribers",
                        message_text: data.subscribers.text,
                        attachments: data.subscribers.attachments as any,
                        is_active: data.subscribers.isActive,
                    },
                });
                updates.push(subscribersUpdate);
            }

            await Promise.all(updates);

            return {
                status: true,
                error: false,
                message: "Automated messages updated successfully",
            };
        } catch (error: any) {
            console.error("Error updating automated messages:", error);
            return {
                status: false,
                error: true,
                message: "Failed to update automated messages",
            };
        }
    }

    static async getAutomatedMessageByType(userId: number, messageType: "followers" | "subscribers") {
        try {
            const message = await prisma.automatedMessage.findUnique({
                where: {
                    user_id_message_type: {
                        user_id: userId,
                        message_type: messageType,
                    },
                },
            });

            if (!message || !message.is_active) {
                return null;
            }

            return {
                text: message.message_text || "",
                attachments: parseAttachments(message.attachments),
            };
        } catch (error: any) {
            console.error("Error getting automated message by type:", error);
            return null;
        }
    }

    static async deleteAutomatedMessage(userId: number, messageType: "followers" | "subscribers") {
        try {
            await prisma.automatedMessage.delete({
                where: {
                    user_id_message_type: {
                        user_id: userId,
                        message_type: messageType,
                    },
                },
            });

            return {
                status: true,
                error: false,
                message: "Automated message deleted successfully",
            };
        } catch (error: any) {
            console.error("Error deleting automated message:", error);
            return {
                status: false,
                error: true,
                message: "Failed to delete automated message",
            };
        }
    }
}