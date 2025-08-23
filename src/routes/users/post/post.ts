import express from "express";
import Auth from "@middleware/Auth";
import UploadController from "@controllers/UploadController";
import PostController from "@controllers/PostController";
const post = express();
// Personal Posts
post.post("/create", Auth, PostController.CreatePost);
post.get("/personal/posts", Auth, PostController.GetMyPosts);
post.get("/personal/private-post", Auth, PostController.MyPrivatePosts);
post.get("/personal/reposts", Auth, PostController.GetMyReposts);
post.get("/personal/media", Auth, PostController.GetMedia); 
post.get("/personal/private-media", Auth, PostController.GetPrivateMedia);

// Other User Posts
post.get(
  "/other/private-posts/:userId",
  Auth,
  PostController.GetPrivatePostByID,
);
post.get("/other/reposts/:userId", Auth, PostController.GetReposts);
post.get("/other/media/:userId", Auth, PostController.GetOtherMedia);
post.get(
  "/other/private-media/:userId",
  Auth,
  PostController.GetOtherPrivateMedia,
);
post.get("/user/:userId", Auth, PostController.GetUserPostByID);
post.get("/single/:postId", Auth, PostController.GetSinglePost);
post.get("/edit/:postId", Auth, PostController.EditPost);
post.post("/update/:postId", Auth, PostController.UpdatePost);
post.put("/update/audience/:postId", Auth, PostController.UpdatePostAudience);
post.post("/repost/:postId", Auth, PostController.CreateRepost);
post.get("/:postId/comments", Auth, PostController.GetPostComments);
post.get(
  "/comments/:commentId/replies",
  Auth,
  PostController.GetCommentReplies,
);

// Post Actions
post.post("/like/:postId", Auth, PostController.LikePost);
post.delete("/:postId", Auth, PostController.DeletePost);
post.post(
  "/media/signed-url",
  Auth,
  UploadController.CreateMediaUploadSignedUrl,
);
post.post("/point/gift", Auth, PostController.GiftPoints);
post.post("/pay", Auth, PostController.PayForPost);

// Mentions and Tags
post.get("/mentions", Auth, PostController.GetMentions);
export default post;
