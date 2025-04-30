import { PostCommentAttachments } from "@prisma/client";

export interface NewCommentResponse {
  status: boolean;
  message: string;
  error?: boolean;
  
  data: Comments | null;
}

export interface LikeCommentResponse {
  error: boolean;
  status: boolean;
  action: string;
  message: string;
}
