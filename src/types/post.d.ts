import { MediaState, Post, PostAudience, PostCommentAttachments, PostLike, Subscribers, UserMedia } from "@prisma/client"
import { AuthUser } from "./user";
// --------------------------------------
// Media Related Interfaces
// --------------------------------------
/**
 * Interface for creating new media
 */
interface CreateMedia {
    id: string;
    type: string;
    public: string;
    blur: boolean;
}
/**
 * Interface for removed media
 */
interface RemovedMedia {
    id: string;
    type: string;
}
/**
 * Response type for fetching user's media
 */
export type GetMyMediaResponse = {
    status: boolean;
    message: string;
    data: UserMedia[];
    total: number;
}
/**
 * Props for fetching user's media
 */
export type GetMyMediaProps = {
    userId: number;
    page: string;
    limit: string;
}
/**
 * Props for fetching another user's media
 */
export type GetOtherMediaProps = {
    userId: string;
    page: string;
    limit: string;
}
/**
 * Response type for fetching another user's media
 */
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
                id: number;
            }
        }
    }[]
    total: number;
}
// --------------------------------------
// Post Creation Related Types
// --------------------------------------
/**
 * Props for creating a new post
 */
interface CreatePostProps {
    content: string;
    visibility: string;
    media: CreateMedia[];
    user: AuthUser;
    removedMedia: RemovedMedia[];
}
/**
 * Success response for post creation
 */
export type CreatePostSuccessResponse = {
    data: Post;
    message: string;
    status: true;
}
/**
 * Error response for post creation
 */
export type CreatePostErrorResponse = {
    status: false;
    message: string;
    error: any
}
/**
 * Combined response type for post creation
 */
export type CreatePostResponse = CreatePostSuccessResponse | CreatePostErrorResponse
// --------------------------------------
// Post Retrieval Related Types
// --------------------------------------
/**
 * Extended post data structure
 */
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
        id: number;
    };
}
/**
 * Props for fetching user's posts
 */
export type GetMyPostProps = {
    userId: number;
    page: string;
    limit: string;
}
/**
 * Success response for fetching user's posts
 */
type GetMyPostSuccessResponse = {
    status: boolean;
    message: string;
    data: MyPost[];
    total: number;
}
/**
 * Combined response type for fetching user's posts
 */
export type GetMyPostResponse = GetMyPostSuccessResponse
/**
 * Props for fetching posts by user ID
 */
export type GetUserPostByIdProps = {
    userId: string;
    page: string;
    limit: string;
}
/**
 * Single post data structure
 */
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
        id: number;
    };
}
/**
 * Response for fetching posts by user ID
 */
export type GetUserPostByIdResponse = {
    status: boolean;
    message: string;
    data: GetSinglePost[];
    total: number;
}
/**
 * Response for fetching a single post
 */
export type GetSinglePostResponse = {
    status: boolean;
    message: string;
    data: GetSinglePost | null;
}
// --------------------------------------
// Post Interaction Related Types
// --------------------------------------
/**
 * Props for liking a post
 */
export interface LikePostProps {
    postId: string;
    userId: number;
}
/**
 * Response for liking a post
 */
export type LikePostResponse = {
    success: boolean;
    isLiked: boolean;
    message: string;
}
/**
 * Response for deleting a post
 */
export type DeletePostResponse = {
    status: boolean;
    message: string;
    error?: any;
}
// --------------------------------------
// Post Editing Related Types
// --------------------------------------
/**
 * Editable post data structure
 */
export interface EditPost {
    id: number;
    content: string | null
    post_id: string
    post_audience: PostAudience
    created_at: Date;
    post_likes: number;
    post_comments: number;
    PostLike: PostLike[],
    UserMedia?: UserMedia[]
}
/**
 * Props for editing a post
 */
export interface EditPostProps {
    postId: string;
    userId: number;
}
/**
 * Response for editing a post
 */
export interface EditPostResponse {
    status: boolean;
    message: string;
    data: EditPost | null;
}
// --------------------------------------
// Repost Related Types
// --------------------------------------
/**
 * Props for reposting
 */
export type RepostProps = {
    userId: string;
    page: string;
    limit: string;
}
/**
 * Props for creating a repost
 */
export interface CreateRepostProps {
    postId: string;
    userId: number;
}
/**
 * Response for repost operations
 */
export interface RepostResponse {
    message: string;
    error: boolean;
}
// --------------------------------------
// Comment Related Types
// --------------------------------------
/**
 * Props for getting post comments
 */
export interface GetPostCommentsProps extends GetMyPostProps {
    postId: string;
}
/**
 * Response for fetching post comments
 */
export interface GetPostCommentsResponse {
    error: boolean;
    message: string;
    data: {
        id: number;
        comment: string;
        created_at: Date;
        user: {
            username: string;
            profile_image: string | null;
            name: string;
        }
        PostCommentAttachments: {
            id: number,
            comment_id: number,
            path: string,
            type: string,
            created_at: Date,
        }[];
        PostCommentLikes: {
            id: number;
            comment_id: number;
            user_id: number;
            created_at: Date;
        }[];
    }[];
    total: number;
}
