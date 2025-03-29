"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@middleware/auth"));
const StoryController_1 = __importDefault(require("@controllers/StoryController"));
const FileUploadConfig_1 = require("@middleware/FileUploadConfig");
const story = (0, express_1.default)();
const storyUpload = (0, FileUploadConfig_1.CreateUpload)("stories");
story.get("/all", auth_1.default, StoryController_1.default.GetStories);
story.get("/media", auth_1.default, StoryController_1.default.GetMyMedia);
story.post("/save", auth_1.default, StoryController_1.default.SaveStory);
story.post("/upload", auth_1.default, storyUpload.array("files[]"), StoryController_1.default.UploadStory);
exports.default = story;
