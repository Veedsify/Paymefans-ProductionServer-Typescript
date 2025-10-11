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
CommentViewSchema.index({ userId: 1, commentId: 1 });

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

// User Profile Schema - Stores user behavior and preferences
const userProfileSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    unique: true,
    index: true,
  },
  followedCreators: {
    type: [Number],
    default: [],
  },
  subscribedCreators: {
    type: [Number],
    default: [],
  },
  topAffinityCreators: {
    type: [
      {
        creatorId: Number,
        score: Number,
      },
    ],
    default: [],
  },
  recentInteractions: {
    type: [
      {
        postId: Number,
        creatorId: Number,
        type: {
          type: String,
          enum: ["view", "like", "comment", "repost", "purchase"],
        },
        timestamp: Number,
      },
    ],
    default: [],
  },
  interactionStats: {
    totalLikes: { type: Number, default: 0 },
    totalComments: { type: Number, default: 0 },
    totalReposts: { type: Number, default: 0 },
    totalPurchases: { type: Number, default: 0 },
  },
  contentPreferences: {
    preferredCreatorTypes: {
      type: [String],
      default: ["model", "regular"],
    },
    engagementPatterns: {
      likesFrequency: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "low",
      },
      commentsFrequency: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "low",
      },
      purchaseWillingness: {
        type: String,
        enum: ["high", "medium", "low"],
        default: "low",
      },
    },
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Recommended Feed Schema - Stores pre-computed recommendations
const recommendedFeedSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true,
  },
  postIds: {
    type: [Number],
    required: true,
  },
  scores: {
    type: [Number],
    required: true,
  },
  computedAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true, // For automatic cleanup
  },
  algorithm: {
    type: String,
    default: "v1",
  },
  metadata: {
    candidateCount: Number,
    computeTimeMs: Number,
    sourceBreakdown: {
      preferredCreators: Number,
      trending: Number,
      discovery: Number,
    },
  },
});

// Create compound index for userId and ensure latest feed is retrieved first
recommendedFeedSchema.index({ userId: 1, computedAt: -1 });

// User Interaction Schema - Tracks real-time interactions
const userInteractionSchema = new mongoose.Schema({
  userId: {
    type: Number,
    required: true,
    index: true,
  },
  postId: {
    type: Number,
    required: true,
  },
  creatorId: {
    type: Number,
    required: true,
    index: true,
  },
  interactionType: {
    type: String,
    enum: ["view", "like", "unlike", "comment", "repost", "purchase"],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  metadata: {
    postAudience: String,
    wasRepost: Boolean,
    sessionId: String,
  },
});

// Compound indexes for efficient queries
userInteractionSchema.index({ userId: 1, timestamp: -1 });
userInteractionSchema.index({ creatorId: 1, timestamp: -1 });
userInteractionSchema.index({ postId: 1, interactionType: 1 });

// TTL index to auto-delete old interactions after 90 days
userInteractionSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });

const UserProfile = mongo.model("UserProfile", userProfileSchema);
const RecommendedFeed = mongo.model("RecommendedFeed", recommendedFeedSchema);
const UserInteraction = mongo.model("UserInteraction", userInteractionSchema);

export {
  Comments,
  CommentLikes,
  CommentViews,
  Wishlist,
  UserProfile,
  RecommendedFeed,
  UserInteraction,
};
