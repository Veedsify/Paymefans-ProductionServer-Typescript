import { User } from "@prisma/client"
import { AuthUser } from "./user"

export type RegisterServiceProp = {
      name: string
      username: string
      email: string
      phone: string
      password: string
      location: string
}

export type RegisterServiceResponse =
      | { error: true; message: string }
      | { error: false; message: string; data: any };


export type FindUserNameResponse = {
      message: string;
      status: boolean;
}

export type LoginUserProps = {
      email: string;
      password: string;
}

export type LoginUserResponse = {
      error: boolean;
      message: string;
      token?: string | null;
      tfa?: boolean;
      user?: Omit<User, "password">;
}  

export type CheckUsernameProps = {
      username: string;
}

export type CheckUsernameResponse = {
      status: boolean;
      message: string;
}
