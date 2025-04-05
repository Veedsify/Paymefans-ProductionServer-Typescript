import { WebhookService } from "@services/WebhookService";
import type { Request, Response } from "express";

class WebhookController {
  static async ProcessedMedia(req: Request, res: Response) {
    try {
      await WebhookService.HandleCloudflareProcessedMedia(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
}

export default WebhookController;
