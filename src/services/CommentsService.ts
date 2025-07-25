import { UploadImageToS3 } from "@libs/UploadImageToS3";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { CommentLikes, Comments } from "@utils/mongoSchema";
import ParseContentToHtml from "@utils/ParseHtmlContent";
import query from "@utils/prisma";
import type { LikeCommentResponse, NewCommentResponse } from "types/comments";
import type { AuthUser } from "types/user";
import { MentionService } from "./MentionService";
import { MentionNotificationQueue } from "@jobs/MentionNotificationJob";
export default class CommentsService {
    // New Comment
    // This is for creating a new comment on a post
    // Function takes in the postId, post_id, reply_to, comment, user and files
    static async NewComment(
        post_id: string,
        comment: string,
        user: AuthUser,
        postId: number,
        parentId: string | null,
        mentions: string,
        files?: Express.Multer.File[],
    ): Promise<NewCommentResponse> {
        try {
            const comment_id = `COM${GenerateUniqueId()}`;
            // Upload files outside the transaction
            let commentAttachments: { name: string; path: string; type: string }[] =
                [];
            if (files && files.length > 0) {
                const uploadPromises = files.map(async (file: Express.Multer.File) => {
                    return new Promise<string | null>((resolve, reject) => {
                        try {
                            UploadImageToS3({
                                file: file,
                                folder: "comments",
                                contentType: "image/webp",
                                format: "webp",
                                quality: 100,
                                resize: {
                                    width: 1000,
                                    height: null,
                                    fit: "cover",
                                    position: "center",
                                },
                                saveToDb: true,
                                deleteLocal: true,
                                onUploadComplete: (url: string) => resolve(url),
                            });
                        } catch (error) {
                            reject(error);
                        }
                    });
                });
                try {
                    const uploadedAttachments = await Promise.all(uploadPromises);
                    commentAttachments = uploadedAttachments
                        .filter((url): url is string => url !== null)
                        .map((url) => ({
                            name: url,
                            path: url,
                            type: "image",
                        }));
                    console.log(commentAttachments);
                } catch (error) {
                    console.error("Error uploading attachments:", error);
                    throw new Error("Failed to upload comment attachments");
                }
            }
            const commentOwner = await query.user.findUnique({
                where: {
                    id: user.id
                }
            })

            const formattedComments = ParseContentToHtml(comment, JSON.parse(mentions))

            const newComment = await Comments.insertOne({
                name: user.name,
                comment_id: comment_id,
                username: user.username,
                userId: user.id,
                profile_image: commentOwner?.profile_image || `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
                postId: String(post_id),
                parentId: parentId && parentId !== "null" ? parentId : null,
                comment: formattedComments,
                attachment: commentAttachments,
                likes: 0,
                impressions: 0,
            });
            if (parentId) {
                await Comments.updateOne(
                    { comment_id: parentId },
                    { $inc: { replies: 1 } }
                )
            }
            await query.post.update({
                where: {
                    id: Number(postId),
                },
                data: {
                    post_comments: {
                        increment: 1,
                    },
                },
            });

            // Process mentions if any
            if (mentions && mentions !== "[]") {

                try {
                    const parsedMentions = JSON.parse(mentions);
                    const validMentions = await MentionService.validateMentions(parsedMentions);

                    if (validMentions.length > 0) {
                        await MentionNotificationQueue.add(
                            "processMentions",
                            {
                                mentions: validMentions,
                                mentioner: {
                                    id: user.id,
                                    username: user.username,
                                    name: user.name || user.username,
                                },
                                type: "comment",
                                contentId: post_id,
                                content: comment,
                            },
                            {
                                removeOnComplete: true,
                                attempts: 3,
                            }
                        );
                    }
                } catch (error) {
                    console.error("Error processing comment mentions:", error);
                }
            }

            return {
                status: true,
                error: false,
                message: "Comment created successfully",
                data: newComment,
            };
        } catch (error) {
            console.log(error);
            return {
                status: false,
                error: true,
                message: "An error occurred while creating comment",
                data: null,
            };
        }
    }
    // Like Comment
    // This is for liking a comment
    static async LikeComment(
        commentId: string,
        user: AuthUser
    ): Promise<LikeCommentResponse> {
        try {
            if (!commentId) {
                return {
                    error: true,
                    status: false,
                    action: "Invalid Comment ID",
                    message: "Comment ID is required to like a comment",
                };
            }

            console.log("Liking comment with ID:", commentId);

            const commentLike = await CommentLikes.findOne({
                commentId: commentId,
                userId: Number(user.id),
            });

            if (commentLike) {
                // Remove like
                await CommentLikes.deleteOne({
                    commentId: commentId,
                    userId: Number(user.id), // Fixed: consistent type conversion
                });
                await Comments.updateOne(
                    { comment_id: commentId },
                    { $inc: { likes: -1 } }
                );

                return {
                    error: false,
                    status: true,
                    action: "Comment Like Removed",
                    message: "Comment like removed successfully",
                };
            } else {
                // Add like
                await CommentLikes.create({
                    date: new Date(),
                    commentId: commentId, // Fixed: consistent type conversion
                    userId: user.id,
                    parentId: null,
                });
                await Comments.updateOne(
                    { comment_id: commentId },
                    { $inc: { likes: 1 } }
                );

                return {
                    error: false,
                    status: true,
                    action: "Comment Liked",
                    message: "Comment liked successfully",
                };
            }
        } catch (error) {
            console.error("Error liking comment:", error);
            return {
                error: true,
                status: false,
                action: "Error",
                message: "An error occurred while liking comment",
            };
        }
    }
}
