import { type Request, type Response } from "express";
import PostService from "@services/PostService";
import { AuthUser } from "types/user";
export default class PostController {
  // Create Post
  static async CreatePost(req: Request, res: Response): Promise<any> {
    try {
      const SavePost = await PostService.CreatePost(
        {
          user: req.user,
          ...req.body,
        },
        req.user?.id!,
      );

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
      const MyPosts = await PostService.GetMyPosts({
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
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
      const PrivatePosts = await PostService.GetMyPrivatePosts({
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
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
      const MyReposts = await PostService.MyReposts({
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
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
      const Reposts = await PostService.Reposts({
        userId: Number(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      });
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
      const Media = await PostService.GetMedia({
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
      return res.status(200).json({
        status: true,
        message: "Media Retreived Successfully",
        data: Media.data,
        total: Media.total,
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
      const Media = await PostService.GetOtherMedia({
        userId: req.params.userId as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      });
      return res.status(200).json(Media);
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
      const Media = await PostService.GetPrivateMedia({
        userId: req.user?.id!,
        page: req.query.page as string,
        limit: req.query.limit as string,
      });
      return res.status(200).json({
        status: true,
        message: "Private Media Retrieved Successfully",
        data: Media.data,
        total: Media.total,
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
      const Media = await PostService.GetOtherPrivateMedia({
        userId: req.params.userId as string,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      });
      return res.status(200).json(Media);
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
      const UserPost = await PostService.GetUserPostByID({
        userId: parseInt(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      });

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
      const UserPost = await PostService.GetUserPrivatePostByID({
        userId: parseInt(req.params.userId) as number,
        page: req.query.page as string,
        limit: req.query.limit as string,
        authUserId: req.user?.id!,
      });
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
      const SinglePost = await PostService.GetSinglePost({
        postId: req.params.postId as string,
        authUserId: req.user?.id!,
      });
      if (SinglePost.error) {
        return res.status(400).json({ ...SinglePost });
      }
      return res.status(200).json({ ...SinglePost });
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
      const EditPost = await PostService.EditPost({
        postId: req.params.postId,
        userId: req.user?.id!,
        ...req.body,
      });
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
      const UpdatePost = await PostService.UpdatePost({
        postId: req.params.postId,
        userId: req.user?.id!,
        ...req.body,
      });
      if (UpdatePost.error) {
        return res.status(400).json({ ...UpdatePost });
      }
      return res.status(200).json({
        status: true,
        message: "Post updated successfully",
        data: UpdatePost,
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
      const UpdateAudience = await PostService.UpdatePostAudience({
        postId: req.params.postId as string,
        userId: req.user?.id!,
        visibility: req.body.visibility,
      });
      return res.status(200).json({ ...UpdateAudience });
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
      const Repost = await PostService.CreateRepost({
        postId: req.params.postId as string,
        userId: req.user?.id!,
      });
      return res.status(200).json({ ...Repost });
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
        userId: req.user?.id!,
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
      const Delete = await PostService.DeletePost(options);
      return res.status(200).json({ ...Delete });
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
      const Gift = await PostService.GiftPoints(options);
      return res.status(200).json({ ...Gift });
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
      const Payment = await PostService.PayForPost(options);
      return res.status(200).json({ ...Payment });
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
      const Mentions = await PostService.GetMentions(options);
      return res.status(200).json({ ...Mentions });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({
        status: false,
        message: "Internal Server Error",
      });
    }
  }
}
