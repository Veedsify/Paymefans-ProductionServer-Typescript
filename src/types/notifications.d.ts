import {Notifications} from "@prisma/client";

export type GetMyNotificationResponse= {
    error: boolean;
    hasMore: boolean;
    data: Notifications[];
}

export interface ReadNotificationResponse {
    error: boolean;
    status: boolean;
    message: string;
}
