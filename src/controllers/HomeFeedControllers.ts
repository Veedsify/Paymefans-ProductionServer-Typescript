import type { Request, Response } from "express";
import FeedService from "@services/HomeFeedService";

const feedService = new FeedService();

class HomeFeedController {
  static async GetHomePosts(req: Request, res: Response) {
    try {
      const cursor = req.query.cursor as string;
      const result = await feedService.getHomeFeed(
        req?.user?.id as number,
        cursor,
      );
      res.json(result);
    } catch (error) {
      console.error("Feed error:", error);
      res.status(500).json({ error: "Error fetching feed" });
    }
  }

  async GetUserPersonalPosts(req: Request, res: Response) {
    try {
      const targetUserId = parseInt(req.params.userId as string);
      const cursor = req.query.cursor as string;
      const result = await feedService.getUserPosts(
        Number(req.user?.id),
        targetUserId,
        cursor,
      );
      res.json(result);
    } catch (error) {
      console.error("User posts error:", error);
      res.status(500).json({ error: "Error fetching user posts" });
    }
  }
}

export default HomeFeedController;
