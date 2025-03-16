import { Request, Response } from "express";
import FeedService from "@services/HomeFeedService";

const feedService = new FeedService()

class HomeFeedController {
      static async GetHomePosts(req: Request, res: Response) {
            try {
                  const page = parseInt(req.query.page as string) || 1;
                  const result = await feedService.getHomeFeed(req?.user?.id as number, page);
                  res.json(result);
            } catch (error) {
                  console.error('Feed error:', error);
                  res.status(500).json({ error: 'Error fetching feed' });
            }
      }

      async GetUserPersonalPosts(req: Request, res: Response) {
            try {
                  const targetUserId = parseInt(req.params.userId);
                  const page = parseInt(req.query.page as string) || 1;
                  const result = await feedService.getUserPosts(Number(req.user?.id), targetUserId, page);
                  res.json(result);
            } catch (error) {
                  console.error('User posts error:', error);
                  res.status(500).json({ error: 'Error fetching user posts' });
            }
      }
}

export default HomeFeedController;
