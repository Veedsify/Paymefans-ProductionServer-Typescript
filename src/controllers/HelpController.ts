import HelpService from "@services/HelpServices";
import { Request, Response } from "express";
export default class HelpController {
  static async GetHelpCategories(_: Request, res: Response): Promise<any> {
    try {
      const categories = await HelpService.GetHelpCategories();
      if (categories.error) {
        res.status(400).json(categories);
      }
      res.status(200).json(categories);
    } catch (error: any) {
      console.error(error.message);
      res.status(500).json({
        error: true,
        message: `An error occurred while getting help categories`,
      });
    }
  }
}
