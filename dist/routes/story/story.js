"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@middleware/auth"));
const StoryController_1 = __importDefault(require("@controllers/StoryController"));
const story = (0, express_1.default)();
story.get("/all", auth_1.default, StoryController_1.default.GetStories);
exports.default = story;
