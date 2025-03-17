import { MediaState, Post, Subscribers, UserMedia } from "@prisma/client"
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


export interface MyPost {
      id: number;
      content: string | null;
      post_id: string;
      post_audience: string;
      media: any;
      created_at: Date;
      post_likes: number;
      post_comments: number;
      post_reposts: number;
      was_repost: boolean;
      repost_id: string | null;
      repost_username: string | null;
      UserMedia?: UserMedia[];
      PostLike: {
            post_id: number;
            user_id: number;
      }[];
      user: {
            username: string;
            profile_image: string | null;
            name: string;
            user_id: string;
            Subscribers: {
                  subscriber_id: number;
            }[];
      };
}

export type GetMyMediaProps = {
      userId: number;
      page: string;
      limit: string;
}

export type GetMyMediaResponse = {
      status: boolean;
      message: string;
      data: UserMedia[];
      total: number;
}

export type GetOtherMediaProps = {
      userId: string;
      page: string;
      limit: string;
}

export type GetOtherMediaResponse = {
      status: boolean;
      message: string;
      data: {
            id: number,
            media_id: string,
            post_id: number,
            poster: string,
            duration: string | null,
            media_state: MediaState,
            url: string,
            blur: string,
            media_type: string,
            locked: boolean,
            accessible_to: string,
            post: {
                  user: {
                        Subscribers: Subscribers[];
                  },
            },
      }[]
      total: number;
}

export type GetMyPostProps = {
      userId: number;
      page: string;
      limit: string;
}

export type RepostProps = {
      userId: string;
      page: string;
      limit: string;
}

type GetMyPostSuccessResponse = {
      status: boolean;
      message: string;
      data: MyPost[];
      total: number;
}

export type GetMyPostResponse = GetMyPostSuccessResponse


export type GetUserPostByIdProps = {
      userId: string;
      page: string;
      limit: string;
}


interface GetSinglePost {
      id: number;
      content: string | null;
      post_id: string;
      post_audience: string;
      media: any;
      created_at: Date;
      post_likes: number;
      post_comments: number;
      post_reposts: number;
      was_repost: boolean;
      repost_id: string | null;
      repost_username: string | null;
      UserMedia?: UserMedia[];
      PostLike: {
            post_id: number;
            user_id: number;
      }[];
      user: {
            username: string;
            profile_image: string | null;
            name: string;
            user_id: string;
            Subscribers: {
                  subscriber_id: number;
            }[];
      };
      
}

export type GetUserPostByIdResponse = {
      status: boolean;
      message: string;
      data: GetSinglePost[];
      total: number;
}


export type GetSinglePostResponse = {
      status: boolean;
      message: string;
      data: GetSinglePost | null;
}
