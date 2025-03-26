import Auth from "@middleware/auth"
import express from "express"
import CommentsController from "@controllers/CommentsController"
import { CreateUpload } from "@middleware/FileUploadConfig"

const comments = express.Router()

const commentUpload = CreateUpload("comments")
comments.post("/new", Auth, commentUpload.fields([{ name: "files", maxCount: 5 }]), CommentsController.NewComment)
comments.post("/like", Auth, CommentsController.LikeComment)

export default comments
