import express from "express"
import Auth from "@middleware/auth";
import UploadController from "@controllers/UploadController";
import PostController from "@controllers/PostController";
import { CreateUpload } from "@middleware/FileUploadConfig";
const post = express()

const postUpload = CreateUpload("post");
post.post("/upload-post-media", Auth, postUpload.single("file"), UploadController.UploadImage);
post.post("/create", Auth, PostController.CreatePost)
post.get("/my-posts", Auth, PostController.GetMyPosts)
post.get("/my-reposts", Auth, PostController.GetMyReposts)
post.get("/reposts/:userId", Auth, PostController.GetReposts)
post.get("/media", Auth, PostController.GetMedia)
post.get("/media/:userId", Auth, PostController.GetOtherMedia)
post.get("/user/:userId", Auth, PostController.GetUserPostByID)
post.get("/:postId", Auth, PostController.GetSinglePost);

export default post
