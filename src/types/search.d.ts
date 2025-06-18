import { Post, User, UserMedia } from "@prisma/client";

export type SearchPlatformResponse = {
    message: string;
    error?: boolean;
    results?: |
    Post[] |
    User[] |
    UserMedia[];
}