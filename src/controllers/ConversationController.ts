import type { Request, Response } from "express";
import ConversationService from "@services/ConversationService";
import type { AuthUser } from "../types/user";

export default class ConversationController {
    // Fetch Conversations
    static async AllConversations(req: Request, res: Response) {
        try {
            const conversations = await ConversationService.AllConversations({
                user: req.user as AuthUser,
                conversationId: req.params.conversationId as string,
                page: req.query.page as string,
                cursor: Number(req.query.cursor) || undefined,
            });
            if (conversations.error) {
                res.status(400).json({ ...conversations });
            }
            res.status(200).json({ ...conversations });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error: ${error}` });
        }
    }

    // Create Conversation
    static async CreateConversation(req: Request, res: Response) {
        try {
            const { user } = req as unknown as { user: AuthUser };
            const { profileId } = req.body;
            const conversation = await ConversationService.CreateConversation({
                user,
                profileId,
            });
            if (conversation.error) {
                res.status(400).json({ ...conversation });
            }
            res.status(200).json({ ...conversation });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error: ${error}` });
        }
    }

    // Fetch My Conversations
    static async MyConversations(req: Request, res: Response) {
        try {
            const conversations = await ConversationService.MyConversations({
                user: req.user as AuthUser,
                page: req.query.page as string,
                limit: req.query.limit as string,
            });
            if (conversations.error) {
                res.status(400).json({ ...conversations });
            }
            res.status(200).json({ ...conversations });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error: ${error}` });
        }
    }

    // Upload Attachments
    static async UploadAttachments(req: Request, res: Response): Promise<any> {
        try {
            const { conversationId } = req.body;
            const attachments = await ConversationService.UploadAttachments({
                conversationId,
                files: req.files as { 'attachments[]': Express.Multer.File[] },
            });
            if (attachments.error) {
                return res.status(400).json({ ...attachments });
            }
            res.status(200).json(attachments);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error: ${error}` });
        }
    }

    // Search Messages:
    static async SearchMessages(req: Request, res: Response): Promise<void> {
        try {
            const searchmessage = await ConversationService.SearchMessages({
                q: req.query.q as string,
                conversationId: req.params.conversationId as string,
            });
            if (searchmessage.error) {
                res.status(400).json({ ...searchmessage });
            }
            res.status(200).json({ ...searchmessage });
        } catch (error) {
            console.log(error);
            res.json({ message: `Internal Server Error ${error}` });
        }
    }

    // Search Conversations
    static async SearchConversations(req: Request, res: Response): Promise<any> {
        const conversations = await ConversationService.SearchConversations({
            q: req.query.q as string,
            user: req.user as AuthUser
        })

        if (conversations.error) {
            res.status(400).json(conversations)
        }
        res.status(200).json({ ...conversations });
    }

    // Conversation Receiver
    static async ConversationReceiver(req: Request, res: Response): Promise<void> {
        try {
            const receiver = await ConversationService.ConversationReceiver({
                conversationId: req.params.conversationId as string,
                user: req.user as AuthUser,
            });
            if (receiver.error) {
                res.status(400).json({ ...receiver });
                return
            }
            res.status(200).json({ ...receiver });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error ${error}` });
        }
    }

    // Get Unread Count
    static async GetUnreadCount(req: Request, res: Response): Promise<void> {
        try {
            const unreadCount = await ConversationService.GetUnreadCount({
                user: req.user as AuthUser,
            });
            if (unreadCount.error) {
                res.status(400).json({ ...unreadCount });
                return;
            }
            res.status(200).json({ unreadCount: unreadCount.count });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error ${error}` });
        }
    }

    // Toggle Free Messages for both users in conversation
    static async ToggleFreeMessages(req: Request, res: Response): Promise<void> {
        try {
            const { enable, conversationId } = req.body;
            const user = req.user as AuthUser;

            if (!conversationId) {
                res.status(400).json({
                    error: true,
                    message: "Conversation ID is required",
                });
                return;
            }

            // Update user's free message setting for this conversation
            const updatedSettings = await ConversationService.ToggleFreeMessages({
                userId: user.id,
                conversationId,
                enable: Boolean(enable),
            });

            if (updatedSettings.error) {
                res.status(400).json({ ...updatedSettings });
                return;
            }

            res.status(200).json({
                error: false,
                message: "Free message setting updated successfully",
                enabled: updatedSettings.enabled,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error ${error}` });
        }
    }

    // Get Free Message Status
    static async GetFreeMessageStatus(req: Request, res: Response): Promise<void> {
        try {
            const user = req.user as AuthUser;
            const { conversationId } = req.params;

            if (!conversationId) {
                res.status(400).json({
                    error: true,
                    message: "Conversation ID is required",
                });
                return;
            }

            const status = await ConversationService.GetFreeMessageStatus({
                conversationId,
                userId: user.id,
            });

            if (status.error) {
                res.status(400).json({ ...status });
                return;
            }

            res.status(200).json({
                error: false,
                userEnabled: status.userEnabled,
                bothEnabled: status.bothEnabled,
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: `Internal Server Error ${error}` });
        }
    }
}
