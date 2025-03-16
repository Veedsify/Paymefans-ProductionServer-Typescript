"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const auth_1 = __importDefault(require("@middleware/auth"));
const UploadController_1 = __importDefault(require("@controllers/UploadController"));
const PostController_1 = __importDefault(require("@controllers/PostController"));
const FileUploadConfig_1 = require("@middleware/FileUploadConfig");
const post = (0, express_1.default)();
const postUpload = (0, FileUploadConfig_1.CreateUpload)("post");
post.post("/upload-post-media", auth_1.default, postUpload.single("file"), UploadController_1.default.UploadImage);
post.post("/create", auth_1.default, PostController_1.default.CreatePost);
exports.default = post;
