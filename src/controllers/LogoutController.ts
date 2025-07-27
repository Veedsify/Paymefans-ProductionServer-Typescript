import type { Request, Response } from "express";
import SocketService from "@services/SocketService";

export default class LogOutController {
  static async Logout(req: Request, res: Response): Promise<void> {
    const { username } = req.body;
    await SocketService.HandleUserInactive(username);
    res.status(200).json({
      success: true,
    });
  }
}
