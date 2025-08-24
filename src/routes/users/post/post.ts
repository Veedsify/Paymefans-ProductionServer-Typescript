import express from "express";
import Auth from "@middleware/Auth";
import UploadController from "@controllers/UploadController";
import PostController from "@controllers/PostController";
import Paths from "@utils/paths";
const post = express();
// Personal Posts
post.post(Paths.API.Post.Create, Auth, PostController.CreatePost);
post.get(Paths.API.Post.PersonalPosts, Auth, PostController.GetMyPosts);
post.get(Paths.API.Post.PersonalPrivatePosts, Auth, PostController.MyPrivatePosts);
post.get(Paths.API.Post.PersonalReposts, Auth, PostController.GetMyReposts);
post.get(Paths.API.Post.PersonalMedia, Auth, PostController.GetMedia);
post.get(Paths.API.Post.PersonalPrivateMedia, Auth, PostController.GetPrivateMedia);

// Other User Posts
post.get(Paths.API.Post.OtherPrivatePosts, Auth, PostController.GetPrivatePostByID);
post.get(Paths.API.Post.OtherReposts, Auth, PostController.GetReposts);
post.get(Paths.API.Post.OtherMedia, Auth, PostController.GetOtherMedia);
post.get(Paths.API.Post.OtherPrivateMedia, Auth, PostController.GetOtherPrivateMedia);
post.get(Paths.API.Post.UserPostsByID, Auth, PostController.GetUserPostByID);
post.get(Paths.API.Post.SinglePost, Auth, PostController.GetSinglePost);
post.get(Paths.API.Post.EditPost, Auth, PostController.EditPost);
post.post(Paths.API.Post.UpdatePost, Auth, PostController.UpdatePost);
post.put(Paths.API.Post.UpdatePostAudience, Auth, PostController.UpdatePostAudience);
post.post(Paths.API.Post.Repost, Auth, PostController.CreateRepost);
post.get(Paths.API.Post.PostComments, Auth, PostController.GetPostComments);
post.get(Paths.API.Post.CommentReplies, Auth, PostController.GetCommentReplies);

// Post Actions
post.post(Paths.API.Post.LikePost, Auth, PostController.LikePost);
post.delete(Paths.API.Post.DeletePost, Auth, PostController.DeletePost);
post.post(Paths.API.Post.MediaSignedUrl, Auth, UploadController.CreateMediaUploadSignedUrl);
post.post(Paths.API.Post.GiftPoints, Auth, PostController.GiftPoints);
post.post(Paths.API.Post.PayForPost, Auth, PostController.PayForPost);

// Mentions and Tags
post.get(Paths.API.Post.Mentions, Auth, PostController.GetMentions);

export default post;
