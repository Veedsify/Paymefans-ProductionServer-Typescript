import StoryService from "@services/StoryService";
import { Request, Response } from "express";
import { StoryType } from "types/story";
import { AuthUser } from "types/user";

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
      console.log(req.body)
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
      const storyUpload = await StoryService.UploadStory({
        files: req.files as Express.Multer.File[],
      });
      if (storyUpload.error) {
        return res.status(400).json(storyUpload);
      }
      res.status(200).json({ ...storyUpload });
    } catch (error: any) {
      console.log(error);
      res.status(500).json({
        message: "An error occurred while uploading stories",
        error: error.message,
        status: false,
      });
    }
  }
}
