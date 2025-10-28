import type { Request, Response } from "express";
import ConversationService from "@services/ConversationService";
import type { AuthUser } from "../types/user";
import { config } from "@configs/config";
import { v4 as uuid } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@utils/aws";
import query from "@utils/prisma";

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
            res.status(500).json({
                message: `Internal Server Error: ${error}`,
            });
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
                res.status(400).json(conversation);
            }
            res.status(200).json(conversation);
        } catch (error) {
            console.log(error);
            res.status(500).json({
                message: `Internal Server Error: ${error}`,
            });
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
            res.status(500).json({
                message: `Internal Server Error: ${error}`,
            });
        }
    }

    // Upload Attachments
    static async UploadAttachments(req: Request, res: Response): Promise<any> {
        try {
            const { conversationId } = req.body;
            const attachments = await ConversationService.UploadAttachments({
                conversationId,
                files: req.files as { "attachments[]": Express.Multer.File[] },
            });
            if (attachments.error) {
                return res.status(400).json({ ...attachments });
            }
            res.status(200).json(attachments);
        } catch (error) {
            console.log(error);
            res.status(500).json({
                message: `Internal Server Error: ${error}`,
            });
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
    static async SearchConversations(
        req: Request,
        res: Response,
    ): Promise<any> {
        const conversations = await ConversationService.SearchConversations({
            q: req.query.q as string,
            user: req.user as AuthUser,
        });

        if (conversations.error) {
            res.status(400).json(conversations);
        }
        res.status(200).json({ ...conversations });
    }

    // Conversation Receiver
    static async ConversationReceiver(
        req: Request,
        res: Response,
    ): Promise<void> {
        try {
            const receiver = await ConversationService.ConversationReceiver({
                conversationId: req.params.conversationId as string,
                user: req.user as AuthUser,
            });
            if (receiver.error) {
                res.status(400).json({ ...receiver });
                return;
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
    static async ToggleFreeMessages(
        req: Request,
        res: Response,
    ): Promise<void> {
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
            const updatedSettings =
                await ConversationService.ToggleFreeMessages({
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
    static async GetFreeMessageStatus(
        req: Request,
        res: Response,
    ): Promise<void> {
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

    // Check Media Status - Poll endpoint for checking processing state
    static async CheckMediaStatus(req: Request, res: Response): Promise<any> {
        try {
            const { media_ids } = req.body;
            const userId = req.user?.id!;

            if (!media_ids || !Array.isArray(media_ids)) {
                return res.status(400).json({
                    message: "media_ids array is required in request body",
                    status: false,
                    error: true,
                });
            }

            const mediaIdsArray = media_ids;

            if (mediaIdsArray.length === 0) {
                return res.status(400).json({
                    message: "At least one media_id is required",
                    status: false,
                    error: true,
                });
            }

            const result = await ConversationService.CheckMediaStatus({
                mediaIds: mediaIdsArray as string[],
                userId,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json({ ...result });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while checking media status",
                error: error.message,
                status: false,
            });
        }
    }

    // Get Presigned URLs for direct S3 upload (Messages)
    static async GetPresignedUrls(req: Request, res: Response): Promise<any> {
        try {
            const { files } = req.body as {
                files: Array<{
                    name: string;
                    type: string;
                    size: number;
                    media_id?: string;
                }>;
            };

            if (!files || !Array.isArray(files)) {
                return res.status(400).json({
                    message: "Files array is required",
                    status: false,
                });
            }

            const urlPromises = files.map(async (file) => {
                const fileExtension = file.name.split(".").pop();
                const media_id = file.media_id || uuid();
                const isVideo = file.type.startsWith("video/");

                let key: string;
                if (isVideo) {
                    key = `process/${media_id}.${fileExtension}`;
                } else {
                    key = `messages/${media_id}.${fileExtension}`;
                }

                const putObjectCommand = new PutObjectCommand({
                    Bucket: config.mainPaymefansBucket!,
                    Key: key,
                    ContentType: file.type,
                });

                const presignedUrl = await getSignedUrl(s3, putObjectCommand, {
                    expiresIn: 7200, // 1 hour
                });

                return {
                    media_id,
                    presignedUrl,
                    key,
                    fileName: file.name,
                    fileType: file.type,
                    fileSize: file.size,
                    isVideo,
                };
            });

            const urls = await Promise.all(urlPromises);

            res.status(200).json({
                error: false,
                data: urls,
                status: true,
            });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while generating presigned URLs",
                error: error.message,
                status: false,
            });
        }
    }

    // Complete Upload - Save uploaded file info to database (Messages)
    static async CompleteUpload(req: Request, res: Response): Promise<any> {
        try {
            const { uploadedFiles } = req.body as {
                uploadedFiles: Array<{
                    media_id: string;
                    key: string;
                    fileName: string;
                    fileType: string;
                    fileSize: number;
                    isVideo: boolean;
                }>;
            };

            if (!uploadedFiles || !Array.isArray(uploadedFiles)) {
                return res.status(400).json({
                    message: "Uploaded files array is required",
                    status: false,
                });
            }

            console.log(
                `💾 Saving ${uploadedFiles.length} files to database for user ${
                    (req.user as AuthUser).id
                }`,
            );

            const transaction = await query.$transaction(async (tx) => {
                const savedFiles = uploadedFiles.map(async (file) => {
                    const cloudfrontUrl = file.isVideo
                        ? `${config.processedCloudfrontUrl}/${file.key
                              .split(".")
                              .slice(0, -1)
                              .join(".")}.mp4`
                        : `${config.mainCloudfrontUrl}/${file.key}`;

                    console.log(`📝 Creating UploadedMedia record:`, {
                        media_id: file.media_id,
                        type: file.isVideo ? "video" : "image",
                        url: cloudfrontUrl,
                        key: file.key,
                    });

                    await tx.uploadedMedia.create({
                        data: {
                            user_id: (req.user as AuthUser).id,
                            media_id: file.media_id,
                            name: file.fileName,
                            type: file.isVideo ? "video" : "image",
                            url: cloudfrontUrl,
                            size: file.fileSize,
                            extension: file.fileName.split(".").slice(-1)[0],
                            key: file.key,
                            media_state: file.isVideo
                                ? "processing"
                                : "completed",
                        },
                    });

                    console.log(
                        `✅ Created UploadedMedia for ${file.media_id} with state: ${
                            file.isVideo ? "processing" : "completed"
                        }`,
                    );

                    return {
                        url: cloudfrontUrl,
                        mimetype: file.fileType,
                        filename: file.fileName,
                        media_state: file.isVideo ? "processing" : "completed",
                        media_id: file.media_id,
                        size: file.fileSize,
                    };
                });

                return Promise.all(savedFiles);
            });

            console.log(`✅ Transaction completed successfully`);

            res.status(200).json({
                error: false,
                data: transaction,
                status: true,
            });
        } catch (error: any) {
            console.error("❌ Transaction failed: ", error);
            res.status(500).json({
                message: "An error occurred while completing upload",
                error: error.message,
                status: false,
            });
        }
    }
}
