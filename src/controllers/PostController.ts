import { type Request, type Response } from "express";
import PostService from "@services/PostService";
import { AuthUser } from "types/user";
import { RedisPostService } from "@services/RedisPostService";
export default class PostController {
  // Create Post
  static async CreatePost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        user: req.user,
        ...req.body,
      }
      const SavePost = await PostService.CreatePost(
        options,
        req.user?.id!,
      );
      console.log(SavePost);
      if ("error" in SavePost && SavePost.error) {
        return res.status(400).json({ message: SavePost.error });
      }
      res.status(201).json(SavePost);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }
  // My Posts
  static async GetMyPosts(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
      const MyPosts = await PostService.GetMyPosts(options);
      return res.status(200).json(MyPosts);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // My Private Posts
  static async MyPrivatePosts(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
      const PrivatePosts = await PostService.GetMyPrivatePosts(options);
      return res.status(200).json(PrivatePosts);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // My Reposts
  static async GetMyReposts(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
      const MyReposts = await PostService.MyReposts(options);
      return res.status(200).json(MyReposts);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get Reposts
  static async GetReposts(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: Number(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      }
      const Reposts = await PostService.Reposts(options);
      return res.status(200).json(Reposts);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get Media
  static async GetMedia(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
      const media = await PostService.GetMedia(options);
      return res.status(200).json({
        status: true,
        message: "media retrieved successfully",
        data: media.data,
        total: media.total,
      });
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  //Get Other Media
  static async GetOtherMedia(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.params.userId as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      }
      const media = await PostService.GetOtherMedia(options);
      return res.status(200).json(media);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get Private Media
  static async GetPrivateMedia(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      }
      const media = await PostService.GetPrivateMedia(options);
      return res.status(200).json({
        status: true,
        message: "Private Media Retrieved Successfully",
        data: media.data,
        total: media.total,
      });
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  //Get Other Private Media
  static async GetOtherPrivateMedia(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.params.userId as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      }
      const media = await PostService.GetOtherPrivateMedia(options);
      return res.status(200).json(media);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get User Post By User ID
  static async GetUserPostByID(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: parseInt(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id || undefined,
      }
      const UserPost = await PostService.GetUserPostByID(options);

      if (UserPost?.error) {
        return res.status(400).json({ ...UserPost });
      }

      return res.status(200).json(UserPost);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get User Private User Posts By ID
  static async GetPrivatePostByID(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: parseInt(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      }
      const UserPost = await PostService.GetUserPrivatePostByID(options);
      return res.status(200).json({ ...UserPost });
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Get Post By Post ID
  static async GetSinglePost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId as string,
        authUserId: req.user?.id || undefined,
      }
      const singlePost = await PostService.GetSinglePost(options);
      if (singlePost.error) {
        return res.status(400).json(singlePost);
      }
      return res.status(200).json(singlePost);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Edit Post
  static async EditPost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId,
        userId: req.user?.id!,
        ...req.body,
      }
      const EditPost = await PostService.EditPost(options);
      if (!EditPost.status) {
        return res.status(400).json(EditPost);
      }
      return res.status(200).json(EditPost);
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Update Post
  static async UpdatePost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId,
        userId: req.user?.id!,
        ...req.body,
      }
      const updatePost = await PostService.UpdatePost(options);
      if (updatePost.error) {
        return res.status(400).json({ ...updatePost });
      }
      return res.status(200).json({
        status: true,
        message: "Post updated successfully",
        data: updatePost,
      });
    } catch (err: any) {
      console.error(err.message);
      res
        .status(500)
        .json({ status: false, message: "Internal Server Error!" });
    }
  }
  // Update Post Audience
  static async UpdatePostAudience(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        visibility: req.body.visibility,
        postId: req.params.postId as string,
        userId: req.user?.id!,
      }
      const updateAudience = await PostService.UpdatePostAudience(options);
      return res.status(200).json(updateAudience);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
  // Create Repost
  static async CreateRepost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId as string,
        userId: req.user?.id!,
      }
      const repost = await PostService.CreateRepost(options);
      return res.status(200).json(repost);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
  // Get Post Comments
  static async GetPostComments(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId as string,
        userId: req.user?.id || undefined,
        page: req.query.page as string,
        limit: req.query.limit as string,
      };
      const Comments = await PostService.GetPostComments(options);
      return res.status(200).json({ ...Comments });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }

  // Get Comment Replies
  static async GetCommentReplies(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        commentId: req.params.commentId as string,
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      };
      const replies = await PostService.GetCommentReplies(options);
      return res.status(200).json({ ...replies });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }

  // Get Post Like Data
  static async GetPostLikeData(req: Request, res: Response): Promise<any> {
    try {
      const postId = req.params.postId as string;
      const userId = req.user?.id;

      // Get like count and user's like status
      const likeCount = await RedisPostService.getLikeCount(postId);
      const isLiked = userId ? await RedisPostService.hasUserLiked(postId, userId) : false;

      return res.status(200).json({
        success: true,
        data: {
          postId,
          likeCount,
          isLiked,
        },
      });
    } catch (error: any) {
      console.error("Error getting post like data:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }

  // Get Multiple Posts Like Data
  static async GetMultiplePostsLikeData(req: Request, res: Response): Promise<any> {
    try {
      const { postIds } = req.body; // Array of post IDs
      const userId = req.user?.id;

      if (!Array.isArray(postIds) || postIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Post IDs array is required",
        });
      }

      const likeData = await RedisPostService.getMultiplePostsLikeData(postIds, userId);

      // Convert Map to object for JSON response
      const result: Record<string, { count: number; isLiked: boolean }> = {};
      likeData.forEach((data, postId) => {
        result[postId] = data;
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error("Error getting multiple posts like data:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
      });
    }
  }

  // Like a Post
  static async LikePost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId as string,
        userId: req.user?.id!,
      };
      const Like = await PostService.LikePost(options);
      return res.status(200).json({ ...Like });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
  // Delete Post
  static async DeletePost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.params.postId as string,
        userId: req.user?.id!,
      };
      const deletePost = await PostService.DeletePost(options);
      return res.status(200).json(deletePost);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
  // Gift Points
  static async GiftPoints(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.body.post_id,
        userId: req.user?.id as AuthUser["id"],
        points: req.body.points,
        amount: req.body.amount,
        points_buy_id: req.body.points_buy_id,
        receiver_id: req.body.user_id,
      };
      const gift = await PostService.GiftPoints(options);
      return res.status(200).json(gift);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }

  // Pay for Post
  static async PayForPost(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        postId: req.body.postId,
        user: req.user as AuthUser,
        price: req.body.price,
      };
      const payment = await PostService.PayForPost(options);
      return res.status(200).json(payment);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }

  // Get Mentions
  static async GetMentions(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        userId: req.user?.id!,
        query: req.query.query as string,
      };
      const mentions = await PostService.GetMentions(options);
      return res.status(200).json(mentions);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
}
