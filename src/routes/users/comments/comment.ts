import Auth from "@middleware/Auth";
import express from "express";
import CommentsController from "@controllers/CommentsController";
import { CreateUpload } from "@middleware/FileUploadConfig";

const comments = express.Router();

const commentUpload = CreateUpload("comments");
comments.post(
  "/new",
  Auth,
  commentUpload.fields([{ name: "files", maxCount: 5 }]),
  CommentsController.NewComment,
);
comments.post("/like", Auth, CommentsController.LikeComment);
comments.post("/view", Auth, CommentsController.ViewComment);
comments.post("/bulk-view", Auth, CommentsController.BulkViewComments);

export default comments;
