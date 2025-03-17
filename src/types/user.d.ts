import { Model, Settings, User, UserPoints, UserWallet } from "@prisma/client";

export interface AuthUser extends Omit<User, "password"> {
    UserPoints: UserPoints | null;
    UserWallet: UserWallet[] | null;
    Settings: Settings | null;
    Model: Model | null;
    _count: {
        Follow: number;
        Subscribers: number;
    };
}

type Role = "fan" | "model" | "admin";

export type RegisteredUser = {
    id: number;
    user_id: string;
    username: string;
    fullname: string
}

export type RetrieveUserResponse = {
    user: AuthUser
    status: boolean;
} | {
    status: boolean;
    message: string;
}


