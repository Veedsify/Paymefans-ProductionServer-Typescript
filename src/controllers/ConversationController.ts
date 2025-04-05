import type {Request, Response} from "express";
import ConversationService from "@services/ConversationService";
import type {AuthUser} from "../types/user";

export default class ConversationController {
    // Fetch Conversations
    static async AllConversations(req: Request, res: Response) {
        try {
            const conversations = await ConversationService.AllConversations({
                user: req.user as AuthUser,
                conversationId: req.params.conversationId as string,
            });
            if (conversations.error) {
                res.status(401).json({...conversations});
            }
            res.status(200).json({...conversations});
        } catch (error) {
            console.log(error);
            res.status(500).json({message: `Internal Server Error: ${error}`});
        }
    }

    // Create Conversation
    static async CreateConversation(req: Request, res: Response) {
        try {
            const {user} = req as unknown as { user: AuthUser };
            const {profileId} = req.body;
            const conversation = await ConversationService.CreateConversation({
                user,
                profileId,
            });
            if (conversation.error) {
                res.status(401).json({...conversation});
            }
            res.status(200).json({...conversation});
        } catch (error) {
            console.log(error);
            res.status(500).json({message: `Internal Server Error: ${error}`});
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
                res.status(401).json({...conversations});
            }
            res.status(200).json({...conversations});
        } catch (error) {
            console.log(error);
            res.status(500).json({message: `Internal Server Error: ${error}`});
        }
    }

    // Upload Attachments
    static async UploadAttachments(req: Request, res: Response): Promise<any> {
        try {
            const {conversationId} = req.body;
            const attachments = await ConversationService.UploadAttachments({
                conversationId,
                files: req.files as { 'attachments[]': Express.Multer.File[] },
            });
            if (attachments.error) {
                return res.status(401).json({...attachments});
            }
            res.status(200).json(attachments);
        } catch (error) {
            console.log(error);
            res.status(500).json({message: `Internal Server Error: ${error}`});
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
                res.status(401).json({...searchmessage});
            }
            res.status(200).json({...searchmessage});
        } catch (error) {
            console.log(error);
            res.json({message: `Internal Server Error ${error}`});
        }
    }

    // Search Conversations
    static async SearchConversations(req: Request, res: Response): Promise<any> {
        const conversations = await ConversationService.SearchConversations({
            q: req.query.q as string,
            user: req.user as AuthUser
        })

        if (conversations.error) {
            res.status(401).json(conversations)
        }
        res.status(200).json({...conversations});
    }
}
