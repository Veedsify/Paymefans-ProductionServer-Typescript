import { mongo } from "./mongodb";
import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  comment_id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  postId: {
    type: String,
    required: true,
    ref: "Comment",
  },
  parentId: {
    type: String,
    default: null,
  },
  profile_image: {
    type: String,
    required: false,
    default: `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
  },
  comment: {
    type: String,
    required: false,
  },
  attachment: {
    type: JSON,
    required: false,
  },
  likes: {
    type: Number,
    default: 0,
  },
  impressions: {
    type: Number,
    default: 0,
  },
  replies: {
    type: Number,
    default: 0,
    ref: "Comment",
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const Comments = mongo.model("Comments", commentSchema);

export { Comments };
