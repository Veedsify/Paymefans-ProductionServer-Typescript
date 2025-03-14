import express from 'express';
import path from 'path';
import http from "http"
import api from "./routes/api.ts";
import AppSocket from "./libs/AppSocket.ts";
import { RegisterCloudflareStreamWebhook } from "./libs/RegisterCloudflareStreamWebhook.ts";
import cors from "cors"
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } = process.env;


const app = express();
const server = http.createServer(app)
const port = 3009
// Cors 
app.use(cors({
    origin: [VERIFICATION_URL as string, ADMIN_PANEL_URL as string, APP_URL as string, LIVESTREAM_PORT as string, "http://localhost:5173"],
    credentials: true,
    optionsSuccessStatus: 200,
}))

// Socket
AppSocket(server).then();

//Register Cloudflare Webhook
RegisterCloudflareStreamWebhook()

// Basic route
app.use("/api", api)

// Serve static files from the "public" directory
app.use(express.static(path.join("../", 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
