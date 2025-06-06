import type {
  CheckUsernameProps,
  CheckUsernameResponse,
  FindUserNameResponse,
} from "../types/auth";
import query from "@utils/prisma";

export default class UsernameService {
  static async CheckUsername({
    username,
  }: CheckUsernameProps): Promise<CheckUsernameResponse> {
    try {
      // Check if username exists
      const usernameExists = await this.findUserName(username);
      if (!usernameExists.status) {
        return { status: false, message: "Username already exists" };
      }
      return { status: true, message: "Username available" };
    } catch (error) {
      return { status: false, message: "Internal server error" };
    }
  }
  public static async findUserName(
    username: string
  ): Promise<FindUserNameResponse> {
    const cleanusername = username.replace(/[^a-zA-Z0-9]/g, "");
    const user = await query.user.findFirst({
      where: {
        username: `@${cleanusername}`,
      },
    });
    if (user && user.username) {
      return { message: "Username already exists", status: false };
    }
    return { message: "Username available", status: true };
  }
}
