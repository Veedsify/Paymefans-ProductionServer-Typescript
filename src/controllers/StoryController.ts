import StoryService from "@services/StoryService";
import { config } from "config/config";
import type { Request, Response } from "express";
import type { StoryType } from "types/story";
import type { AuthUser } from "types/user";

export default class StoryController {
  //Get Stories from the database
  static async GetStories(req: Request, res: Response): Promise<any> {
    try {
      const stories = await StoryService.GetStories({ userId: req.user?.id! });
      res.status(200).json({ ...stories });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while fetching stories",
        error: error.message,
        status: false,
      });
    }
  }
  // Get My Media
  static async GetMyMedia(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        page: req.query.page as string,
        limit: req.query.limit as string,
        user: req.user as AuthUser,
      };
      const media = await StoryService.GetMyMedia(options);
      if (media.error) {
        return res.status(400).json(media);
      }
      res.status(200).json({ ...media });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while fetching stories",
        error: error.message,
        status: false,
      });
    }
  }
  // Save Story
  static async SaveStory(req: Request, res: Response): Promise<any> {
    try {
      const options = {
        stories: req.body.stories as StoryType[],
        user: req.user as AuthUser,
      };
      const media = await StoryService.SaveStory(options);
      if (media.error) {
        return res.status(400).json(media);
      }
      res.status(200).json({ ...media });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while saving stories",
        error: error.message,
        status: false,
      });
    }
  }
  // Upload Story
  static async UploadStory(req: Request, res: Response): Promise<any> {
    try {
      const files = req.files as any[];
      console.log('Uploaded files:', files);
      const uploadedFiles = files.map((file) => {
        const isVideo = file.mimetype.startsWith('video/');
        const cloudfrontUrl = isVideo ? `${config.processedCloudfrontUrl}/${file.key.split(".").slice(0, -1).join(".")}.mp4` : `${config.mainCloudfrontUrl}/${file.key}`;
        return {
          url: cloudfrontUrl,
          mimetype: file.mimetype,
          filename: file.originalname,
          media_id: file.key,
          size: file.size,
        };
      });
      res.status(200).json({ error: false, data: uploadedFiles });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while uploading stories",
        error: error.message,
        status: false,
      });
    }
  }

  // View Story
  static async ViewStory(req: Request, res: Response): Promise<any> {
    try {
      const { storyMediaId } = req.body;
      const viewerId = req.user?.id!;

      if (!storyMediaId) {
        return res.status(400).json({
          message: "Story Media ID is required",
          status: false,
        });
      }

      const result = await StoryService.ViewStory({ storyMediaId, viewerId });

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while recording story view",
        error: error.message,
        status: false,
      });
    }
  }

  // Get Story Views
  static async GetStoryViews(req: Request, res: Response): Promise<any> {
    try {
      const { storyMediaId } = req.params;
      const userId = req.user?.id!;
      const cursor = parseInt(req.query.cursor as string);

      if (!storyMediaId) {
        return res.status(400).json({
          message: "Story Media ID is required",
          status: false,
        });
      }

      const result = await StoryService.GetStoryViews({
        storyMediaId,
        userId,
        cursor,
      });

      if (result.error) {
        return res.status(400).json(result);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while fetching story views",
        error: error.message,
        status: false,
      });
    }
  }
}
