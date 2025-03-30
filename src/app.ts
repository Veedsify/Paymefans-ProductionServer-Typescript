import "module-alias/register";
import express from 'express';
import path from 'path';
import http from "http"
import api from "@routes/api";
import AppSocket from "@libs/AppSocket";
import { RegisterCloudflareStreamWebhook } from "@libs/RegisterCloudflareStreamWebhook";
import cors from "cors"
import logger from "morgan"
import cron from "node-cron";
import ModelsRedisPubSub from "@libs/ModelsRedisPubSub";
import IoInstance from "@libs/io";
import TriggerModels from "jobs/models";
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } = process.env;


const app = express();
const server = http.createServer(app)
const port = 3009

// Logger
app.use(logger("dev"));

// Cors 
app.use(cors({
    origin: [VERIFICATION_URL!, ADMIN_PANEL_URL!, APP_URL!, LIVESTREAM_PORT!, "http://localhost:5173"].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
}))

// Instance of Socket.IO
IoInstance.init(server).then((instance) => {
    // Socket
    AppSocket(instance).then();
    //Redis Model PubSub
    ModelsRedisPubSub(instance)
})

//Register Cloudflare Webhook
RegisterCloudflareStreamWebhook()

// Cron Jobs
cron.schedule("*/2 * * * *", async () => {
    // Trigger Model Jobs
    await TriggerModels(1)
})

// Serve static files from the "public" directory
app.use(express.static(path.join('public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());


// Basic route
app.use("/api", api)


// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
