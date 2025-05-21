import { AuthUser } from "./user";

export type ProfileServiceResponse = {
      message: string;
      status: boolean;
      user?: {
            id: number;
            username: string;
            name: string;
            fullname: string;
            user_id: string;
            admin: boolean;
            role: string;
            is_active: boolean;
            is_verified: boolean;
            website: string | null;
            country: string | null;
            location: string | null;
            city: string | null;
            zip: string | null;
            post_watermark: string | null;
            total_followers: number;
            total_following: number;
            total_subscribers: number;
            email: string;
            profile_image: string | null;
            profile_banner: string | null;
            bio: string | null;
            isFollowing: boolean;
            followsYou: boolean;
            Subscribers: {
                  subscriber_id: number;
            }[];
      };
}


export type BannerChangeResponse = {
      message: string;
      status: boolean;
      url?: string
}

export type ProfileUpdateResponse = {
      message: string;
      status: boolean;
      url?: string
}


export type ProfileUpdateInfo = {
      name: string;
      location: string;
      email: string;
      bio: string;
      website: string;
      username: string;
      instagram?: string;
      twitter?: string;
      facebook?: string;
      tiktok?: string;
      youtube?: string;
      snapchat?: string;
      telegram?: string;
}


export type ProfileStatsProps = {
      user: AuthUser;
      type: "followers" | "subscribers" | "following";
      limit: number;
      cursor: number | null;
      query: string;
}

export type ProfileStatsResponse = {
      error: boolean;
      message: string;
      data: any;
      hasMore: boolean;
      total: number;
      nextCursor: number | null
}

export interface ProfileDataItem {
      id: number;
      [key: string]: any; // Extend with actual fields
}