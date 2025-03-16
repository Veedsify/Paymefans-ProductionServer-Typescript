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
const api = express_1.default.Router();
// Authentication
api.use("/auth", auth_1.default);
// Feeds
api.use("/feeds", feed_1.default);
// Profile
api.use("/profile", profile_1.default);
// Post
api.use("/post", post_1.default);
exports.default = api;
