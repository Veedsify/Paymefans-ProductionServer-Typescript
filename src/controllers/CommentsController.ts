import type { AuthUser } from "types/user"
import type { Request, Response } from "express"
import CommentsService from "@services/CommentsService"

export default class CommentsController {
    // New Comment
    // This is for creating a new comment on a post
    static NewComment = async (req: Request, res: Response): Promise<any> => {
        try {
            const { post_id, postId, comment, parentId, mentions } = req.body
            const { user } = req as { user: AuthUser }
            const { files } = req.files as { files: Express.Multer.File[] }
            const newComment = await CommentsService.NewComment(post_id, comment, user, postId, parentId, mentions, files)
            if (newComment.error) {
                return res.status(400).json({ ...newComment })
            }
            return res.status(200).json({ ...newComment })
        } catch (error) {
            console.log(error)
            return res.status(500).json(`An error occured while creating comment`)
        }
    }
    // Like Comment
    // This is for liking a comment
    static LikeComment = async (req: Request, res: Response): Promise<any> => {
        try {
            const { commentId } = req.body as { commentId: string }
            const { user } = req as { user: AuthUser }
            if (!commentId) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: "Invalid comment ID",
                    data: null,
                })
            }
            const likeComment = await CommentsService.LikeComment(commentId, user)
            if (likeComment.error) {
                return res.status(400).json({ ...likeComment })
            }
            return res.status(200).json({ ...likeComment })
        } catch (error) {
            console.log(error)
            return res.status(500).json(`An error occured while liking comment`)
        }
    }
}
