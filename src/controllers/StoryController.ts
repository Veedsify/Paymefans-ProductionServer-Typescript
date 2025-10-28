import StoryService from "@services/StoryService";
import query from "@utils/prisma";
import { config } from "@configs/config";
import type { Request, Response } from "express";
import type { StoryType } from "types/story";
import type { AuthUser } from "types/user";
import { v4 as uuid } from "uuid";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "@utils/aws";

export default class StoryController {
    //Get Stories from the database
    static async GetStories(req: Request, res: Response): Promise<any> {
        try {
            const stories = await StoryService.GetStories({
                userId: req.user?.id!,
            });
            res.status(200).json({ ...stories });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while fetching stories",
                error: error.message,
                status: false,
            });
        }
    }

    // Get User Stories - Get stories for a specific user by username or ID
    static async GetUserStories(req: Request, res: Response): Promise<any> {
        try {
            const { username } = req.params;
            const viewerId = req.user?.id!;

            if (!username) {
                return res.status(400).json({
                    message: "Username is required",
                    status: false,
                });
            }

            const stories = await StoryService.GetUserStories({
                username,
                viewerId,
            });

            if (stories.error) {
                return res.status(400).json(stories);
            }

            res.status(200).json({ ...stories });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while fetching user stories",
                error: error.message,
                status: false,
            });
        }
    }

    // Get My Media
    static async GetMyMedia(req: Request, res: Response): Promise<any> {
        try {
            const options = {
                page: req.query.page as string,
                limit: req.query.limit as string,
                user: req.user as AuthUser,
            };
            const media = await StoryService.GetMyMedia(options);
            if (media.error) {
                return res.status(400).json(media);
            }
            res.status(200).json({ ...media });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while fetching stories",
                error: error.message,
                status: false,
            });
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

            const result = await StoryService.CheckMediaStatus({
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

    // Save Story
    static async SaveStory(req: Request, res: Response): Promise<any> {
        try {
            const options = {
                stories: req.body.stories as StoryType[],
                user: req.user as AuthUser,
            };
            const media = await StoryService.SaveStory(options);
            if (media.error) {
                return res.status(400).json(media);
            }
            res.status(200).json({ ...media });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while saving stories",
                error: error.message,
                status: false,
            });
        }
    }
    // Get Presigned URLs for direct S3 upload
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
                const media_id = file.media_id || uuid(); // Use client-provided media_id if available
                const isVideo = file.type.startsWith("video/");

                let key: string;
                if (isVideo) {
                    key = `process/${media_id}.${fileExtension}`;
                } else {
                    key = `stories/${media_id}.${fileExtension}`;
                }

                const putObjectCommand = new PutObjectCommand({
                    Bucket: config.mainPaymefansBucket!,
                    Key: key,
                    ContentType: file.type,
                });

                const presignedUrl = await getSignedUrl(s3, putObjectCommand, {
                    expiresIn: 3600, // 1 hour
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

    // Complete Upload - Save uploaded file info to database
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

            const transaction = await query.$transaction(async (tx) => {
                const savedFiles = uploadedFiles.map(async (file) => {
                    const cloudfrontUrl = file.isVideo
                        ? `${config.processedCloudfrontUrl}/${file.key
                              .split(".")
                              .slice(0, -1)
                              .join(".")}.mp4`
                        : `${config.mainCloudfrontUrl}/${file.key}`;

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
                        },
                    });

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

            res.status(200).json({
                error: false,
                data: transaction,
                status: true,
            });
        } catch (error: any) {
            console.log("Transaction failed: ", error);
            res.status(500).json({
                message: "An error occurred while completing upload",
                error: error.message,
                status: false,
            });
        }
    }

    // Upload Story
    static async UploadStory(req: Request, res: Response): Promise<any> {
        try {
            const files = req.files as any[];
            const transaction = await query.$transaction(async (tx) => {
                const uploadedFiles = files.map(async (file) => {
                    const isVideo = file.mimetype.startsWith("video/");
                    const media_id = uuid();
                    const cloudfrontUrl = isVideo
                        ? `${config.processedCloudfrontUrl}/${file.key
                              .split(".")
                              .slice(0, -1)
                              .join(".")}.mp4`
                        : `${config.mainCloudfrontUrl}/${file.key}`;
                    await tx.uploadedMedia.create({
                        data: {
                            user_id: (req.user as AuthUser).id,
                            media_id: media_id,
                            name: file.originalname,
                            type: isVideo ? "video" : "image",
                            url: cloudfrontUrl,
                            size: file.size,
                            extension: file.originalname
                                .split(".")
                                .slice(-1)[0],
                            key: file.key,
                        },
                    });
                    return {
                        url: cloudfrontUrl,
                        mimetype: file.mimetype,
                        filename: file.originalname,
                        media_state: isVideo ? "processing" : "completed",
                        media_id: media_id,
                        size: file.size,
                    };
                });
                return Promise.all(uploadedFiles);
            });
            res.status(200).json({
                error: false,
                data: transaction,
                status: true,
            });
        } catch (error: any) {
            console.log("Transaction failed: ", error);
            // Fallback to non-transactional upload in case of failure
            return StoryController.FallbackUploadStory(req, res);
        }
    }

    // Fallback Upload Story without transaction
    static async FallbackUploadStory(
        req: Request,
        res: Response,
    ): Promise<any> {
        try {
            const files = req.files as any[];
            const uploadedFiles = files.map(async (file) => {
                const isVideo = file.mimetype.startsWith("video/");
                const media_id = uuid();
                const cloudfrontUrl = isVideo
                    ? `${config.processedCloudfrontUrl}/${file.key
                          .split(".")
                          .slice(0, -1)
                          .join(".")}.mp4`
                    : `${config.mainCloudfrontUrl}/${file.key}`;
                await query.uploadedMedia.create({
                    data: {
                        user_id: (req.user as AuthUser).id,
                        media_id: media_id,
                        name: file.originalname,
                        type: isVideo ? "video" : "image",
                        url: cloudfrontUrl,
                        size: file.size,
                        extension: file.originalname.split(".").slice(-1)[0],
                        key: file.key,
                    },
                });
                return {
                    url: cloudfrontUrl,
                    mimetype: file.mimetype,
                    filename: file.originalname,
                    media_state: isVideo ? "processing" : "completed",
                    media_id: media_id,
                    size: file.size,
                };
            });
            const resolvedFiles = await Promise.all(uploadedFiles);
            res.status(200).json({ error: false, data: resolvedFiles });
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while uploading stories",
                error: error.message,
                status: false,
            });
        }
    }

    // View Story
    static async ViewStory(req: Request, res: Response): Promise<any> {
        try {
            const { storyMediaId } = req.body;
            const viewerId = req.user?.id!;

            if (!storyMediaId) {
                return res.status(400).json({
                    message: "Story Media ID is required",
                    status: false,
                });
            }

            const result = await StoryService.ViewStory({
                storyMediaId,
                viewerId,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            res.status(500).json({
                message: "An error occurred while recording story view",
                error: error.message,
                status: false,
            });
        }
    }

    // Get Story Views
    static async GetStoryViews(req: Request, res: Response): Promise<any> {
        try {
            const { storyMediaId } = req.params;
            const userId = req.user?.id!;
            const cursor = parseInt(req.query.cursor as string);

            if (!storyMediaId) {
                return res.status(400).json({
                    message: "Story Media ID is required",
                    status: false,
                });
            }

            const result = await StoryService.GetStoryViews({
                storyMediaId,
                userId,
                cursor,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while fetching story views",
                error: error.message,
                status: false,
            });
        }
    }

    // Get Story Mentions
    static async GetStoryMentions(req: Request, res: Response): Promise<any> {
        try {
            const { storyMediaId } = req.params;

            if (!storyMediaId) {
                return res.status(400).json({
                    message: "Story Media ID is required",
                    status: false,
                });
            }

            const result = await StoryService.GetStoryMentions({
                storyMediaId,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while fetching story mentions",
                error: error.message,
                status: false,
            });
        }
    }

    // Add Story Mentions
    static async AddStoryMentions(req: Request, res: Response): Promise<any> {
        try {
            const { storyMediaId, mentionedUserIds } = req.body;
            const userId = req.user?.id!;

            if (
                !storyMediaId ||
                !mentionedUserIds ||
                !Array.isArray(mentionedUserIds)
            ) {
                return res.status(400).json({
                    message:
                        "Story Media ID and mentioned user IDs are required",
                    status: false,
                });
            }

            const result = await StoryService.AddStoryMentions({
                storyMediaId,
                mentionedUserIds,
                mentionerId: userId,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while adding story mentions",
                error: error.message,
                status: false,
            });
        }
    }

    // Delete Story
    static async DeleteStory(req: Request, res: Response): Promise<any> {
        try {
            const { storyMediaId } = req.params;
            const userId = req.user?.id!;

            if (!storyMediaId) {
                return res.status(400).json({
                    message: "Story Media ID is required",
                    status: false,
                });
            }

            const result = await StoryService.DeleteStory({
                storyMediaId,
                userId,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.log(error);
            res.status(500).json({
                message: "An error occurred while deleting the story",
                error: error.message,
                status: false,
            });
        }
    }
}
