import WebhookController from "@controllers/WebhookController";
import express from "express";
const webhooks = express.Router();

webhooks.post(
  "/cloudflare/processed-post-media",
  WebhookController.ProcessedMedia,
);
webhooks.get("/model-signup-callback", WebhookController.ModelSignupCallback);

export default webhooks;
