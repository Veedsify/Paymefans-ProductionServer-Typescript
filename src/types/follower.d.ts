import { Follow } from "@prisma/client";
import { AuthUser } from "./user";

export type CheckFollowerProps = {
    userId: number;
    followerId: number;
}
export interface CheckFollowerResponse {
    status: boolean;
    error: boolean;
    message: string;
    followers: Follow[]
}
export interface GetAllFollowersProps {
    query: {
        min: string;
        max: string;
    }
    user: AuthUser
}

export interface FollowType {
    id: number;
    username: string;
    name: string;
    fullname: string;
    profile_image: string | null;
}

export interface GetAllFollowersResponse {
    status: boolean;
    error: boolean;
    message: string;
    followers: {
        user: FollowType | null;
        iAmFollowing: boolean;
    }[]
    minmax: string;
}


export type CheckUserIsFollowingResponse = | {
    status: boolean;
    followId: string;
} | {
    status: boolean;
    message: string;
}

export type FollowUserResponse = {
    status: boolean;
    action: "followed" | "unfollowed" | "error";
    followUuid: string | null;
}
