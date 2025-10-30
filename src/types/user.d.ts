import {
    Model,
    Settings,
    User,
    UserPoints,
    UserRole,
    UserWallet,
} from "@prisma/client";
import { JsonArray, JsonValue } from "@prisma/client/runtime/library";

export interface AuthUser extends Omit<User, "password"> {
    UserPoints?: Partial<UserPoints | null>;
    UserWallet: Partial<UserWallet | null>;
    Settings: Partial<Settings | null>;
    Model: Model | null;
    subscriptions: number[];
    purchasedPosts: number[];
    _count: {
        Follow: number;
        Subscribers: number;
    };
}

type Role = "fan" | "model" | "admin";

export type RegisteredUser = {
    id: number;
    email: string;
    user_id: string;
    username: string;
    name: string;
};

export type RetrieveUserResponse = {
    user?: Partial<AuthUser>;
    status: boolean;
    message: string;
};

type UpdateTwoFactorAuthResponse = {
    success: boolean;
    message: string;
    error: boolean;
};

type VerificationControllerResponse = {
    success: boolean;
    message: string;
    error: boolean;
    token?: {
        accessToken: string;
        refreshToken: string;
    };
    user?: AuthUser;
};

export type UserJwtPayloadResponse = {
    id: number;
    active_status: boolean;
    email: string;
    username: string;
    user_id: string;
    name: string;
    flags: JsonValue;
    should_delete: boolean;
    password: string;
    role: UserRole;
    is_email_verified: boolean;
    Settings: {
        two_factor_auth: boolean;
    } | null;
};


export interface UserPasswordResetType {
    email: string;
    code: string;
    newPassword: string;
}

export interface UserResetPasswordResponse {
    error: boolean;
    message: string;
    status?: boolean
}