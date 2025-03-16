import express from "express"
import Auth from "../../middleware/auth";
import UploadController from "../../controllers/UploadController.ts";
import PostController from "../../controllers/PostController.ts";
import { CreateUpload } from "../../middleware/FileUploadConfig";
const post = express()

const postUpload = CreateUpload("post");
post.post("/upload-post-media", Auth, postUpload.single("file"), UploadController.UploadImage);
post.post("/create", Auth, PostController.CreatePost)
export default post
