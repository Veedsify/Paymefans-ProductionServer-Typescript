import express from "express"
import Auth from "@middleware/auth";
import UploadController from "@controllers/UploadController";
import PostController from "@controllers/PostController";
import { CreateUpload } from "@middleware/FileUploadConfig";
const post = express()

const postUpload = CreateUpload("post");
// Personal Posts
post.post("/upload-post-media", Auth, postUpload.single("file"), UploadController.UploadMedia);
post.post("/create", Auth, PostController.CreatePost)
post.get("/personal/posts", Auth, PostController.GetMyPosts)
post.get("/personal/private-post", Auth, PostController.MyPrivatePosts)
post.get("/personal/reposts", Auth, PostController.GetMyReposts)
post.get("/personal/media", Auth, PostController.GetMedia)

// Other User Posts
post.get("/other/private-posts/:userId", Auth, PostController.GetPrivatePostByID)
post.get("/other/reposts/:userId", Auth, PostController.GetReposts)
post.get("/other/media/:userId", Auth, PostController.GetOtherMedia)
post.get("/user/:userId", Auth, PostController.GetUserPostByID)
post.get("/:postId", Auth, PostController.GetSinglePost);
post.get("/edit/:postId", Auth, PostController.EditPost)
post.put("/update/audience/:postId", Auth, PostController.UpdatePostAudience)
post.post("/repost/:postId", Auth, PostController.CreateRepost)
post.get("/:postId/comments", Auth, PostController.GetPostComments)

// Post Actions
post.post("/like/:postId", Auth, PostController.LikePost)
post.delete("/:postId", Auth, PostController.DeletePost)
post.post("/media/signed-url", Auth, UploadController.CreateMediaUploadSignedUrl)
post.post("/point/gift", Auth, PostController.GiftPoints)
post.post("/pay", Auth, PostController.PayForPost)
export default post
