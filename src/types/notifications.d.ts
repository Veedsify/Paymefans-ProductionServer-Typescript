import { Notifications } from "@prisma/client";

export type GetMyNotificationResponse = {
    error: boolean;
    hasMore: boolean;
    data: Notifications[];
}

export interface ReadNotificationResponse {
    error: boolean;
    status: boolean;
    message: string;
}

export interface MentionUser {
    id: number;
    username: string;
    name: string;
}

export interface MentionJobData {
    mentions: MentionUser[];
    mentioner: MentionUser;
    type: "post" | "comment";
    contentId: string;
    content?: string;
    contentOwnerId?: number;
}
