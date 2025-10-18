import type { AuthUser } from "types/user";
import type { Request, Response } from "express";
import CommentsService from "@services/CommentsService";

export default class CommentsController {
  // New Comment
  // This is for creating a new comment on a post
  static NewComment = async (req: Request, res: Response): Promise<any> => {
    try {
      const { post_id, comment, parentId, mentions, reply_to } = req.body;
      const { user } = req as { user: AuthUser };
      const { files } = req.files as { files: Express.Multer.File[] };
      const newComment = await CommentsService.NewComment(
        post_id,
        comment,
        user,
        parentId,
        mentions,
        reply_to,
        files
      );
      if (newComment.error) {
        return res.status(400).json({ ...newComment });
      }
      return res.status(200).json({ ...newComment });
    } catch (error) {
      console.log(error);
      return res.status(500).json(`An error occured while creating comment`);
    }
  };
  // Like Comment
  // This is for liking a comment
  static LikeComment = async (req: Request, res: Response): Promise<any> => {
    try {
      const { commentId } = req.body as { commentId: string };
      const { user } = req as { user: AuthUser };
      if (!commentId) {
        return res.status(400).json({
          status: false,
          error: true,
          message: "Invalid comment ID",
          data: null,
        });
      }
      const likeComment = await CommentsService.LikeComment(commentId, user);
      if (likeComment.error) {
        return res.status(400).json({ ...likeComment });
      }
      return res.status(200).json({ ...likeComment });
    } catch (error) {
      console.log(error);
      return res.status(500).json(`An error occured while liking comment`);
    }
  };

  // View Comment
  // This is for tracking a comment view
  static ViewComment = async (req: Request, res: Response): Promise<any> => {
    try {
      const { commentId } = req.body as { commentId: string };
      const { user } = req as { user: AuthUser };

      if (!commentId) {
        return res.status(400).json({
          status: false,
          error: true,
          message: "Invalid comment ID",
          data: null,
        });
      }

      if (!user && !req.user?.id) {
        return res.status(200).json({
          status: true,
          error: false,
          message: "Skipped Recording Comment View",
          data: null,
        });
      }

      const viewComment = await CommentsService.ViewComment(commentId, user);

      if (viewComment.error && viewComment.status === false) {
        return res.status(201).json({ ...viewComment });
      }

      if (viewComment.error && viewComment.status === true) {
        return res.status(400).json({ ...viewComment });
      }

      return res.status(200).json({ ...viewComment });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json(`An error occured while tracking comment view`);
    }
  };

  // Bulk View Comments
  // This is for tracking multiple comment views at once
  static BulkViewComments = async (
    req: Request,
    res: Response,
  ): Promise<any> => {
    try {
      const { commentIds } = req.body as { commentIds: string[] };
      const { user } = req as { user: AuthUser };

      if (
        !commentIds ||
        !Array.isArray(commentIds) ||
        commentIds.length === 0
      ) {
        return res.status(400).json({
          status: false,
          error: true,
          message: "Invalid comment IDs array",
          data: null,
        });
      }

      const bulkViewComments = await CommentsService.BulkViewComments(
        commentIds,
        user,
      );
      if (bulkViewComments.error) {
        return res.status(400).json({ ...bulkViewComments });
      }
      return res.status(200).json({ ...bulkViewComments });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json(`An error occured while tracking bulk comment views`);
    }
  };
}
