import { Post } from "@prisma/client"
import { AuthUser } from "./user";

interface CreateMedia {
      id: string;
      type: string;
      public: string;
      blur: boolean;
}
interface RemovedMedia {
      id: string;
      type: string;
}
interface CreatePostProps {
      content: string;
      visibility: string;
      media: CreateMedia[];
      user: AuthUser;
      removedMedia: RemovedMedia[];
}

export type CreatePostSuccessResponse = {
      data: Post;
      message: string;
      status: true;
}

export type CreatePostErrorResponse = {
      status: false;
      message: string;
      error: any
}

export type CreatePostResponse = CreatePostSuccessResponse | CreatePostErrorResponse
