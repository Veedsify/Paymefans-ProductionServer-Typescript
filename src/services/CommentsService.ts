import { UploadImageToS3 } from "@libs/UploadImageToS3";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { Comments } from "@utils/mongoSchema";
import query from "@utils/prisma";
import type { LikeCommentResponse, NewCommentResponse } from "types/comments";
import type { AuthUser } from "types/user";
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
        files?: Express.Multer.File[]
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
            const newComment = await Comments.insertOne({
                name: user.name,
                comment_id: comment_id,
                username: user.username,
                userId: user.user_id,
                profile_image: commentOwner?.profile_image || `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
                postId: String(post_id),
                parentId: parentId && parentId !== "null" ? parentId : null,
                comment: comment,
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
            let action: string = "";
            const result = await query.$transaction(async (prisma) => {
                const commentLike = await prisma.postCommentLikes.findFirst({
                    where: {
                        comment_id: Number(commentId),
                        user_id: Number(user.id),
                    },
                });
                if (commentLike) {
                    await prisma.postCommentLikes.deleteMany({
                        where: {
                            comment_id: Number(commentId),
                            user_id: Number(user.id),
                        },
                    });
                    action = "Comment Like Removed";
                    return {
                        error: false,
                        action,
                        status: true,
                        message: "Comment like removed successfully",
                    };
                } else {
                    await prisma.postCommentLikes.create({
                        data: {
                            comment_id: Number(commentId),
                            user_id: Number(user.id),
                        },
                    });
                    action = "Comment Liked";
                    return {
                        error: false,
                        status: true,
                        action,
                        message: "Comment liked successfully",
                    };
                }
            });
            return result;
        } catch (error) {
            console.log(error);
            return {
                error: true,
                action: "",
                status: false,
                message: "An error occurred while processing comment like",
            };
        }
    }
}
