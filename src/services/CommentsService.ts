import { UploadImageToS3 } from "@libs/UploadImageToS3";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { CommentLikes, Comments, CommentViews } from "@utils/mongoSchema";
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
          id: user.id,
        },
      });

      const formattedComments = ParseContentToHtml(
        comment,
        JSON.parse(mentions),
      );

      const newComment = await Comments.insertOne({
        name: user.name,
        comment_id: comment_id,
        username: user.username,
        userId: user.id,
        profile_image:
          commentOwner?.profile_image ||
          `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
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
          { $inc: { replies: 1 } },
        );
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
          const validMentions = await MentionService.validateMentions(
            parsedMentions,
            user.id,
          );

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
              },
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
    user: AuthUser,
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
          { $inc: { likes: -1 } },
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
          { $inc: { likes: 1 } },
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

  // View Comment
  // This is for tracking a comment view
  static async ViewComment(
    commentId: string,
    user: AuthUser,
  ): Promise<{ status: boolean; error: boolean; message: string; data?: any }> {
    try {
      if (!commentId) {
        return {
          status: false,
          error: true,
          message: "Comment ID is required",
        };
      }

      console.log(commentId, user.id);

      // Check if user has already viewed this comment
      const existingView = await CommentViews.findOne({
        commentId: commentId,
        userId: user.id,
      });

      if (existingView) {
        return {
          status: true,
          error: false,
          message: "Comment view already recorded",
          data: existingView,
        };
      }

      // Record the view
      const commentView = await CommentViews.create({
        commentId: commentId,
        userId: user.id,
        viewedAt: new Date(),
      });

      // Increment impressions count on the comment
      await Comments.updateOne(
        { comment_id: commentId },
        { $inc: { impressions: 1 } },
      );

      return {
        status: true,
        error: false,
        message: "Comment view recorded successfully",
        data: commentView,
      };
    } catch (error) {
      console.error("Error recording comment view:", error);
      return {
        status: false,
        error: true,
        message: "An error occurred while recording comment view",
      };
    }
  }

  // Bulk View Comments
  // This is for tracking multiple comment views at once
  static async BulkViewComments(
    commentIds: string[],
    user: AuthUser,
  ): Promise<{ status: boolean; error: boolean; message: string; data?: any }> {
    try {
      if (
        !commentIds ||
        !Array.isArray(commentIds) ||
        commentIds.length === 0
      ) {
        return {
          status: false,
          error: true,
          message: "Valid comment IDs array is required",
        };
      }

      // Find which comments the user hasn't viewed yet
      const existingViews = await CommentViews.find({
        commentId: { $in: commentIds },
        userId: user.id,
      });

      const viewedCommentIds = existingViews.map((view) => view.commentId);
      const newCommentIds = commentIds.filter(
        (id) => !viewedCommentIds.includes(id),
      );

      if (newCommentIds.length === 0) {
        return {
          status: true,
          error: false,
          message: "All comments have already been viewed",
          data: { viewedCount: 0, alreadyViewed: commentIds.length },
        };
      }

      // Create new view records
      const newViews = newCommentIds.map((commentId) => ({
        commentId: commentId,
        userId: user.id,
        viewedAt: new Date(),
      }));

      const insertedViews = await CommentViews.insertMany(newViews);

      // Increment impressions for all newly viewed comments
      await Comments.updateMany(
        { comment_id: { $in: newCommentIds } },
        { $inc: { impressions: 1 } },
      );

      return {
        status: true,
        error: false,
        message: "Bulk comment views recorded successfully",
        data: {
          viewedCount: insertedViews.length,
          alreadyViewed: viewedCommentIds.length,
          totalProcessed: commentIds.length,
          newViews: insertedViews,
        },
      };
    } catch (error) {
      console.error("Error recording bulk comment views:", error);
      return {
        status: false,
        error: true,
        message: "An error occurred while recording bulk comment views",
      };
    }
  }
}
