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

  static async ModelSignupCallback(req: Request, res: Response): Promise<any> {
    try {
      const { reference } = req.query;
      if (!reference || typeof reference !== "string") {
        return res.status(400).json({ error: "Reference is required" });
      }
      const handleModelSignup = await WebhookService.HandleModelSignupCallback(
        reference!,
      );

      if ("error" in handleModelSignup && handleModelSignup.error) {
        return res.status(400).json(handleModelSignup);
      }

      res.status(200).redirect(handleModelSignup.url);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }

  static async MediaProcessingComplete(req: Request, res: Response) {
    try {
      await WebhookService.HandleMediaProcessingComplete(req.body);
      res.sendStatus(200);
    } catch (err) {
      console.error(err);
      res.sendStatus(500);
    }
  }
}

export default WebhookController;
