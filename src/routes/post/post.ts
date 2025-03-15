import express from "express"
import Auth from "../../middleware/auth";
import UploadController from "../../controllers/UploadController";
import { CreateUpload } from "../../middleware/FileUploadConfig";
const post = express()

const postUpload = CreateUpload("post");
post.post("/upload-post-media", Auth, postUpload.single("file"), UploadController.UploadImage);

export default post
