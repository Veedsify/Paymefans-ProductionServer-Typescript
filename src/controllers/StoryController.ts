import StoryService from "@services/StoryService";
import { Request, Response } from "express";


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
                        status: false
                  });
            }
      }
}
