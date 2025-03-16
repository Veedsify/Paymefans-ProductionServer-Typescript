"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("module-alias/register");
const express_1 = __importDefault(require("express"));
const path_1 = __importDefault(require("path"));
const http_1 = __importDefault(require("http"));
const api_1 = __importDefault(require("@routes/api"));
const AppSocket_1 = __importDefault(require("@libs/AppSocket"));
const RegisterCloudflareStreamWebhook_1 = require("@libs/RegisterCloudflareStreamWebhook");
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const { ADMIN_PANEL_URL, VERIFICATION_URL, APP_URL, LIVESTREAM_PORT } = process.env;
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
const port = 3009;
// Logger
app.use((0, morgan_1.default)("dev"));
// Cors 
app.use((0, cors_1.default)({
    origin: [VERIFICATION_URL, ADMIN_PANEL_URL, APP_URL, LIVESTREAM_PORT, "http://localhost:5173"].filter(Boolean),
    credentials: true,
    optionsSuccessStatus: 200,
}));
// Socket
(0, AppSocket_1.default)(server).then();
//Register Cloudflare Webhook
(0, RegisterCloudflareStreamWebhook_1.RegisterCloudflareStreamWebhook)();
// Serve static files from the "public" directory
app.use(express_1.default.static(path_1.default.join('public')));
app.use(express_1.default.urlencoded({ extended: false }));
app.use(express_1.default.json());
// Basic route
app.use("/api", api_1.default);
// Start the server
server.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
