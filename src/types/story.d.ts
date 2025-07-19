import { StoryMedia, UserMedia } from "@prisma/client";

export interface GetStoriesResponse {
  message: string;
  status: boolean;
  data: any;
}

export type GetStoryMediaResponse = {
  status: boolean;
  error: boolean;
  message: string;
  data: UserMedia[];
  total: number;
  hasMore: boolean;
};

export interface GetStoryMediaProps {
  page: string;
  limit: string;
  user: AuthUser;
}

interface CaptionElement {
  id: string;
  type: "text" | "link";
  content: string;
  url?: string;
  position: {
    x: number;
    y: number;
  };
  style: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
    textAlign: "left" | "center" | "right";
    fontStyle?: string;
    textDecoration?: string;
  };
}


export type StoryType = {
  id: number;
  index: number;
  media_type: string;
  media_url: string;
  caption?: string;
  captionElements?: CaptionElement[];
};

export interface SaveStoryProps {
  stories: StoryType[];
  user: AuthUser;
}

export interface Story {
  user_id: number;
  story_id: string;
  StoryMedia: StoryMedia[];
}
export interface SaveStoryResponse {
  error: boolean;
  data: Story;
}

export interface UploadStoryProps {
  files: Express.Multer.File[];
}

export interface UploadStoryResponse {
  error: boolean;
  data: {
    filename: string;
    mimetype: string;
  }[];
}

export interface ViewStoryProps {
  storyId: string;
  viewerId: number;
}

export interface ViewStoryResponse {
  error: boolean;
  message: string;
  data?: any;
}

export interface GetStoryViewsProps {
  storyId: string;
  userId: number;
}

export interface GetStoryViewsResponse {
  error: boolean;
  message: string;
  data?: {
    views: StoryViewWithViewer[];
    viewCount: number;
    storyId: string;
  };
}

export interface StoryViewWithViewer {
  id: number;
  story_id: string;
  viewer_id: number;
  viewed_at: Date;
  viewer: {
    id: number;
    username: string;
    name: string;
    profile_image: string;
  };
}
