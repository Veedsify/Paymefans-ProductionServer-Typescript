import { AuthUser } from "types/user"
import { Request, Response } from "express"
import CommentsService from "@services/CommentsService"
export default class CommentsController {
    // New Comment
    // This is for creating a new comment on a post
    static NewComment = async (req: Request, res: Response): Promise<any> => {
        try{
            const { postId, comment} = req.body
            const { user } = req as {user: AuthUser}
            const { files } = req.files as { files: Express.Multer.File[] }
            const newComment = await CommentsService.NewComment(postId, comment, user, files)
            if(newComment.error){
                return res.status(401).json({...newComment})
            }
            return res.status(200).json({...newComment})
        }catch(error){
            console.log(error)
            return res.status(500).json(`An error occured while creating comment`)
        }
    }
    // Like Comment
    // This is for liking a comment
    static LikeComment = async (req: Request, res: Response): Promise<any> => {
        try{
            const { commentId } = req.body
            const { user } = req as {user: AuthUser}
            const likeComment = await CommentsService.LikeComment(commentId, user)
            if(likeComment.error){
                return res.status(401).json({...likeComment})
            }
            return res.status(200).json({...likeComment})
        }  catch(error){
            console.log(error)
            return res.status(500).json(`An error occured while liking comment`)
        }
    }
}
