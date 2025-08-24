import type { Request, Response } from "express";
import SocketService from "@services/SocketService";
import { redis } from "@libs/RedisStore";
import { serialize } from "cookie";


export default class LogOutController {
  static async Logout(req: Request, res: Response): Promise<void> {
    const { username } = req.body;
    const userId = req.user?.id as number;
    const key = `refresh_token_${userId}`;
    redis.del(key);
    await SocketService.HandleUserInactive(username);
    res
      .setHeader("Set-Cookie", [
        serialize("token", "", {
          httpOnly: process.env.NODE_ENV === "production",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(0),
        }),
        serialize("refresh_token", "", {
          httpOnly: process.env.NODE_ENV === "production",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          expires: new Date(0),
        })
      ])
      .status(200).json({
        success: true,
      });
  }
}
