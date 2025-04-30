import WebhookController from '@controllers/WebhookController';
import express from 'express';
const webhooks = express.Router();

webhooks.post("/cloudflare/processed-post-media", WebhookController.ProcessedMedia)
export default webhooks;
