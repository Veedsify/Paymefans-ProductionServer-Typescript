import type { Request, Response } from "express";
import UploadService from "@services/UploadService";
import { AuthUser } from "types/user";

class UploadController {
  static async CreateMediaUploadSignedUrl(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      const uploadResponse = await UploadService.CreateMediaUploadSignedUrl({
        data: req.body,
        user: req.user as AuthUser,
      });
      if (uploadResponse.error) {
        return res.status(400).json(uploadResponse);
      }
      return res.status(200).json(uploadResponse);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }
}

export default UploadController;
