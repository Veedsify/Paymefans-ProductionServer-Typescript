import { Model, Settings, User, UserPoints, UserWallet } from "@prisma/client";

export interface AuthUser extends Omit<User, "password"> {
  UserPoints: UserPoints | null;
  UserWallet: UserWallet | null;
  Settings: Settings | null;
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
  user_id: string;
  username: string;
  fullname: string;
};

export type RetrieveUserResponse =
  | {
    user: AuthUser;
    status: boolean;
  }
  | {
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
  token?: string;
  user?: AuthUser;
};
