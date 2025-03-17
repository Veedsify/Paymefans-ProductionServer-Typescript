"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegisterCloudflareStreamWebhook = RegisterCloudflareStreamWebhook;
const { CLOUDFLARE_WEBHOOK_URL, CLOUDFLARE_ACCOUNT_TOKEN } = process.env;
const TEST_WEBHOOK_URL = `https://247b-197-211-59-109.ngrok-free.app`;
function RegisterCloudflareStreamWebhook() {
    try {
        function register() {
            return __awaiter(this, void 0, void 0, function* () {
                const data = {
                    notificationUrl: `${TEST_WEBHOOK_URL}/api/webhooks/cloudflare/processed-post-media`,
                };
                const res = yield fetch(CLOUDFLARE_WEBHOOK_URL, {
                    method: "PUT",
                    body: JSON.stringify(data),
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${CLOUDFLARE_ACCOUNT_TOKEN}`
                    },
                });
                if (!res.ok) {
                    console.error("Failed to register webhook", res);
                }
                const response = yield res.json();
                console.log("Webhook registered", response);
            });
        }
        register();
    }
    catch (error) {
        console.error("Failed to register webhook", error);
    }
}
