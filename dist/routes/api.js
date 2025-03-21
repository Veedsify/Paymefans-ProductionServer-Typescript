"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@routes/auth/auth"));
const feed_1 = __importDefault(require("@routes/feed/feed"));
const profile_1 = __importDefault(require("@routes/profile/profile"));
const post_1 = __importDefault(require("@routes/post/post"));
const story_1 = __importDefault(require("@routes/story/story"));
const point_1 = __importDefault(require("@routes/points/point"));
const settings_1 = __importDefault(require("@routes/settings/settings"));
const model_1 = __importDefault(require("@routes/model/model"));
const wallet_1 = __importDefault(require("@routes/wallet/wallet"));
const follower_1 = __importDefault(require("@routes/follower/follower"));
const subscribers_1 = __importDefault(require("./subscriber/subscribers"));
const api = express_1.default.Router();
// Authentication
api.use("/auth", auth_1.default);
// Feeds
api.use("/feeds", feed_1.default);
// Profile
api.use("/profile", profile_1.default);
// Post
api.use("/post", post_1.default);
//Points
api.use("/points", point_1.default);
// Story
api.use("/story", story_1.default);
// Settings
api.use("/settings", settings_1.default);
// Models
api.use("/models", model_1.default);
// Wallet & Transactions & Banks
api.use("/wallet", wallet_1.default);
//Subscriber 
api.use("/subscribers", subscribers_1.default);
// Followers
api.use("/follower", follower_1.default);
exports.default = api;
