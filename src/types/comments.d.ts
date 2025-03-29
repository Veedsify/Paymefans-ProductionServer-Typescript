import { PostCommentAttachments } from "@prisma/client"

export interface NewCommentResponse {
    status: boolean,
    message: string,
    error?: boolean,
    data: {
        id: number,
        comment: string,
        comment_id: string,
        post_id: number,
        user_id: number,
        created_at: Date,
        updated_at: Date,
        PostCommentAttachments: PostCommentAttachments[]
    } | null
}

export interface LikeCommentResponse{
    error: boolean;
    status: boolean;
    action: string;
    message: string
}
