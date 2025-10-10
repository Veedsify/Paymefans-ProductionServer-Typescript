import {
  MediaState,
  Post,
  PostAudience,
  PostCommentAttachments,
  PostLike,
  Subscribers,
  User,
  UserMedia,
} from "@prisma/client";
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
  data: (UserMedia & {
    isSubscribed: boolean;
    hasPaid: boolean;
    post: { watermark_enabled: boolean };
  })[];
  total: number;
};
/**
 * Props for fetching user's media
 */
export type GetMyMediaProps = {
  userId: number;
  page: string;
  limit: string;
};
/**
 * Props for fetching another user's media
 */
export type GetOtherMediaProps = {
  userId: string;
  page: string;
  limit: string;
  authUserId: number;
};
/**
 * Response type for fetching another user's media
 */
export type GetOtherMediaResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    media_id: string;
    post_id: number;
    poster: string;
    duration: string | null;
    media_state: MediaState;
    url: string;
    blur: string;
    media_type: string;
    locked: boolean;
    accessible_to: string;
    isSubscribed: boolean;
    hasPaid: boolean;
    post: {
      id: number;
      post_price: number | null;
      post_audience: string;
      watermark_enabled: boolean;
      user: {
        id: number;
      };
    };
  }[];
  hasMore: boolean;
};

/**
 * Props for fetching private media (for current user)
 */
export type GetPrivateMediaProps = {
  userId: number;
  page: string;
  limit: string;
};

/**
 * Response type for fetching private media
 */
export type GetPrivateMediaResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    media_id: string;
    post_id: number;
    poster: string;
    duration: string | null;
    media_state: MediaState;
    url: string;
    blur: string;
    media_type: string;
    locked: boolean;
    accessible_to: string;
    isSubscribed: boolean;
    hasPaid: boolean;
    post: {
      watermark_enabled: boolean;
    };
  }[];
  total: number;
};

/**
 * Props for fetching another user's private media
 */
export type GetOtherPrivateMediaProps = {
  userId: string;
  page: string;
  limit: string;
  authUserId: number;
};

/**
 * Response type for fetching another user's private media
 */
export type GetOtherPrivateMediaResponse = {
  status: boolean;
  message: string;
  data: {
    id: number;
    media_id: string;
    post_id: number;
    poster: string;
    duration: string | null;
    media_state: MediaState;
    url: string;
    blur: string;
    media_type: string;
    locked: boolean;
    accessible_to: string;
    isSubscribed: boolean;
    hasPaid: boolean;
    post: {
      id: number;
      post_price: number | null;
      post_audience: string;
      watermark_enabled: boolean;
      user: {
        id: number;
      };
    };
  }[];
  hasMore: boolean;
};
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
  price: number | null;
  mentions: MentionUser[];
  removedMedia: RemovedMedia[];
  isWaterMarkEnabled?: boolean;
}
/**
 * Success response for post creation
 */
export type CreatePostSuccessResponse = {
  data: Post;
  message: string;
  status: true;
};
/**
 * Error response for post creation
 */
export type CreatePostErrorResponse = {
  status: false;
  message: string;
  error: any;
};
/**
 * Combined response type for post creation
 */
export type CreatePostResponse =
  | CreatePostSuccessResponse
  | CreatePostErrorResponse;
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
  post_status: string;
  post_impressions: number;
  repost_id: string | null;
  repost_username: string | null;
  UserMedia?: UserMedia[];
  likedByme: boolean;
  isSubscribed: boolean;
  wasReposted: boolean;
  watermark_enabled?: boolean;
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
};
/**
 * Success response for fetching user's posts
 */
type GetMyPostSuccessResponse = {
  status: boolean;
  message: string;
  data: MyPost[];
  hasMore?: boolean;
};
/**
 * Combined response type for fetching user's posts
 */
export type GetMyPostResponse = GetMyPostSuccessResponse;
/**
 * Props for fetching posts by user ID
 */
export type GetUserPostByIdProps = {
  userId: number;
  page: string;
  limit: string;
  authUserId: number | undefined;
};
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
  post_impressions: number;
  post_status: string;
  was_repost: boolean;
  repost_id: string | null;
  repost_username: string | null;
  UserMedia?: UserMedia[];
  likedByme: boolean;
  isSubscribed: boolean;
  hasPaid: boolean;
  wasReposted: boolean;
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
  error: boolean;
  status: boolean;
  message: string;
  data: GetSinglePost[];
  hasMore: boolean;
};
/**
 * Response for fetching a single post
 */
export type GetSinglePostResponse = {
  status: boolean;
  message: string;
  error: boolean;
  data: GetSinglePost | null;
};
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
  likeCount?: number;
};
/**
 * Response for deleting a post
 */
export type DeletePostResponse = {
  status: boolean;
  message: string;
  error?: any;
};
// --------------------------------------
// Post Editing Related Types
// --------------------------------------
/**
 * Editable post data structure
 */
export interface EditPost {
  id: number;
  content: string | null;
  post_id: string;
  post_audience: PostAudience;
  created_at: Date;
  post_likes: number;
  post_comments: number;
  PostLike: PostLike[];
  UserMedia?: UserMedia[];
}
/**
 * Props for editing a post
 */
export interface EditPostProps {
  postId: string;
  userId: number;
}

/**
 * Props for updating a post
 */
export interface UpdatePostProps {
  postId: string;
  userId: number;
  content?: string;
  visibility?: string;
  media?: CreateMedia[];
  removedMedia?: RemovedMedia[];
  mentions?: MentionUser[];
  price?: number;
  isWaterMarkEnabled?: boolean;
}
/**
 * Response for editing a post
 */
export interface EditPostResponse {
  status: boolean;
  message: string;
  data: EditPost | null;
}

/**
 * Response for updating a post
 */
export interface UpdatePostResponse {
  status: boolean;
  message: string;
  data?: any;
  error?: boolean;
}
// --------------------------------------
// Repost Related Types
// --------------------------------------
/**
 * Props for reposting
 */
export type RepostProps = {
  userId: number;
  page: string;
  limit: string;
  authUserId: number;
};
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
  userId: number | undefined;
}
/**
 * Comment data structure
 */
export interface Comments extends PostCommentAttachments {
  id: number;
  comment_id: string;
  post_id: number;
  user_id: number;
  content: string;
  created_at: Date;
  updated_at: Date;
  total_likes: number;
  total_replies: number;
  parent_comment_id: string | null;
  comment_status: string;
  User: {
    id: number;
    user_id: string;
    username: string;
    name: string;
    profile_image: string | null;
    isVerified: boolean;
  };
  CommentLikes: {
    id: number;
    user_id: number;
    comment_id: number;
  }[];
}
/**
 * Response for fetching post comments
 */
export interface GetPostCommentsResponse {
  error: boolean;
  hasMore: boolean;
  message: string;
  data: (Comments & {
    likedByme: boolean;
    children: Comments[];
    totalReplies: number;
    hasMoreReplies: boolean;
    relevanceScore?: number;
  })[];
  total: number;
}

export interface GiftPointsProps {
  postId: string;
  points: number;
  userId: number;
  amount: number;
  receiver_id: number;
  points_buy_id: string;
}

export interface PayForPostProps {
  postId: string;
  user: AuthUser;
  price: string;
}

export interface PayForPostResponse {
  error: boolean;
  status: boolean;
  message: string;
}

export interface GetMentionsProps {
  query: string;
  userId: number;
}

export interface GetMentionsResponse {
  status: boolean;
  message: string;
  mentions?: {
    id: number;
    username: string;
    profile_image: string | null;
    name: string;
  }[];
}

export interface MentionUser {
  id: number;
  username: string;
  name: string;
  avatar?: string;
  isVerified?: boolean;
}
