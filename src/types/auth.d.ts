import { User } from "@prisma/client";
import { AuthUser } from "./user";

export type RegisterServiceProp = {
  name: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  ip: string | undefined;
  location: string;
};

export type RegisterServiceResponse = {
  shouldRedirect?: boolean;
  token?: string | null;
  tfa?: boolean;
  error: boolean;
  message: string;
  data?: any;
};

export type FindUserNameResponse = {
  message: string;
  status: boolean;
};

export type LoginUserProps = {
  email: string;
  ip: string | undefined;
  password: string;
};

export type LoginUserResponse = {
  error: boolean;
  message: string;
  token?: string | null;
  refresh?: string;
  tfa?: boolean;
  user?: {
    id: number;
    active_status: boolean;
    email: string;
    username: string;
    user_id: string;
    name: string;
    should_delete: boolean;
    flags: JsonValue;
    Settings: {
      two_factor_auth: boolean;
    } | null;
  };
};

export type CheckUsernameProps = {
  username: string;
};

export type CheckUsernameResponse = {
  status: boolean;
  message: string;
};
