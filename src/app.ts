import express from 'express';
import path from 'path';
import http from "http"
import api from "./routes/api.ts";
import AppSocket from "./libs/AppSocket.ts";
import { RegisterCloudflareStreamWebhook } from "./libs/RegisterCloudflareStreamWebhook.ts";
import cors from "cors"
import logger from "morgan"
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

// Socket
AppSocket(server).then();

//Register Cloudflare Webhook
RegisterCloudflareStreamWebhook()

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
