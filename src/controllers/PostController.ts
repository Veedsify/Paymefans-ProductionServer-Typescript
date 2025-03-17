import { Request, Response } from "express";
import PostService from "@services/PostService";
export default class PostController {
      // Create Post
      static async CreatePost(req: Request, res: Response): Promise<any> {
            try {
                  const SavePost = await PostService.CreatePost({
                        user: req.user,
                        ...req.body,
                  });
                  if ('error' in SavePost && SavePost.error) {
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
                  const MyPosts = await PostService.GetMyPosts({ userId: req.user?.id!, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ status: true, message: 'Post Retreived Successfully', data: MyPosts.data, total: MyPosts.total })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // My Reposts
      static async GetMyReposts(req: Request, res: Response): Promise<any> {
            try {
                  const MyReposts = await PostService.MyReposts({ userId: req.user?.id!, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ status: true, message: 'Reposts Retreived Successfully', data: MyReposts.data, total: MyReposts.total })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Get Reposts
      static async GetReposts(req: Request, res: Response): Promise<any> {
            try {
                  const Reposts = await PostService.Reposts({ userId: req.params.userId, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ status: true, message: 'Reposts Retreived Successfully', data: Reposts.data, total: Reposts.total })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Get Media
      static async GetMedia(req: Request, res: Response): Promise<any> {
            try {
                  const Media = await PostService.GetMedia({ userId: req.user?.id!, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ status: true, message: 'Media Retreived Successfully', data: Media.data, total: Media.total })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      //Get Other Media
      static async GetOtherMedia(req: Request, res: Response): Promise<any> {
            try {
                  const Media = await PostService.GetOtherMedia({ userId: req.params.userId, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ status: true, message: 'Media Retreived Successfully', data: Media.data, total: Media.total })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Get User Post By User ID
      static async GetUserPostByID(req: Request, res: Response): Promise<any> {
            try {
                  const UserPost = await PostService.GetUserPostByID({ userId: req.params.userId, page: req.query.page as string, limit: req.query.limit as string })
                  return res.status(200).json({ ...UserPost })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Get Post By Post ID
      static async GetSinglePost(req: Request, res: Response): Promise<any> {
            try {
                  const SinglePost = await PostService.GetSinglePost({ postId: req.params.postId, userId: req.user?.id! })
                  return res.status(200).json({ ...SinglePost })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Edit Post
      static async EditPost(req: Request, res: Response): Promise<any> {
            try {
                  const EditPost = await PostService.EditPost({ postId: req.params.postId, userId: req.user?.id!, ...req.body })
                  return res.status(200).json({ status: true, message: 'Post Updated Successfully', data: EditPost })
            } catch (err: any) {
                  console.error(err.message)
                  res.status(500).json({ status: false, message: 'Internal Server Error!' })
            }
      }
      // Update Post Audience
      static async UpdatePostAudience(req: Request, res: Response): Promise<any> {
            try {
                  const UpdateAudience = await PostService.UpdatePostAudience({ postId: req.params.postId, userId: req.user?.id!, visibility: req.body.visibility })
                  return res.status(200).json({ ...UpdateAudience })
            } catch (error: any) {
                  console.log(error.message)
                  res.status(500).json({
                        status: false,
                        message: "Internal Server Error"
                  })
            }
      }
      // Create Repost
      static async CreateRepost(req: Request, res: Response): Promise<any> {
            try {
                  const Repost = await PostService.CreateRepost({ postId: req.params.postId, userId: req.user?.id! })
                  return res.status(200).json({ ...Repost })
            } catch (error: any) {
                  console.log(error.message)
                  res.status(500).json({
                        status: false,
                        message: "Internal Server Error"
                  })
            }
      }
      // Get Post Comments
      static async GetPostComments(req: Request, res: Response): Promise<any> {
            try {
                  const options = {
                        postId: req.params.postId,
                        userId: req.user?.id!,
                        page: req.query.page as string,
                        limit: req.query.limit as string
                  }
                  const Comments = await PostService.GetPostComments(options)
                  return res.status(200).json({ ...Comments })
            } catch (error: any) {
                  console.log(error.message)
                  res.status(500).json({
                        status: false,
                        message: "Internal Server Error"
                  })
            }
      }
      // Like a Post
      static async LikePost(req: Request, res: Response): Promise<any> {
            try {
                  const options = { postId: req.params.postId, userId: req.user?.id! }
                  const Like = await PostService.LikePost(options)
                  return res.status(200).json({ ...Like })
            } catch (error: any) {
                  console.log(error.message)
                  res.status(500).json({
                        status: false,
                        message: "Internal Server Error"
                  })
            }
      }
      // Delete Post
      static async DeletePost(req: Request, res: Response): Promise<any> {
            try {
                  const options = { postId: req.params.postId, userId: req.user?.id! }
                  const Delete = await PostService.DeletePost(options)
                  return res.status(200).json({ ...Delete })
            } catch (error: any) {
                  console.log(error.message)
                  res.status(500).json({
                        status: false,
                        message: "Internal Server Error"
                  })
            }
      }
} 
