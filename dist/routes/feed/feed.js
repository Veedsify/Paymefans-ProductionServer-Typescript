"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@middleware/auth"));
const HomeFeedControllers_1 = __importDefault(require("@controllers/HomeFeedControllers"));
const feed = express_1.default.Router();
// Authentication
feed.get("/home", auth_1.default, HomeFeedControllers_1.default.GetHomePosts);
exports.default = feed;
