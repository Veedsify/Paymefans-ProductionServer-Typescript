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
};

export interface GetStoryMediaProps {
  page: string;
  limit: string;
  user: AuthUser;
}
export type StoryType = {
  id: number;
  media_type: string;
  media_url: string;
  caption?: string;
  captionStyle?: {
    fontFamily: string;
    fontSize: string;
    fontWeight: string;
    color: string;
  };
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
  user: AuthUser;
}

export interface UploadStoryResponse {
  error: boolean;
  data: {
    filename: string;
    mimetype: string;
  }[];
}
