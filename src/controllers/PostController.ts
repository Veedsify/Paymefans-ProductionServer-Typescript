import { Request, Response } from "express";
import PostService from "@services/PostService";

export default class PostController {
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
} 
