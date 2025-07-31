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
    type: Number,
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

const CommentLikeSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true,
  },
  userId: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const CommentViewSchema = new mongoose.Schema({
  commentId: {
    type: String,
    required: true,
  },
  userId: {
    type: Number,
    required: true,
  },
  viewedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index for userId and commentId to ensure uniqueness
CommentViewSchema.index({ userId: 1, commentId: 1 }, { unique: true });

const wishlistSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
  },
  productId: {
    type: String,
    required: true,
  },
  product: {
    type: JSON,
    required: true,
  },
  dateAdded: {
    type: Date,
    default: Date.now,
  },
});

// Create compound index for userId and productId to ensure uniqueness
wishlistSchema.index({ userId: 1, productId: 1 }, { unique: true });

const Comments = mongo.model("Comments", commentSchema);
const CommentLikes = mongo.model("CommentLikes", CommentLikeSchema);
const CommentViews = mongo.model("CommentViews", CommentViewSchema);
const Wishlist = mongo.model("Wishlist", wishlistSchema);

export { Comments, CommentLikes, CommentViews, Wishlist };
