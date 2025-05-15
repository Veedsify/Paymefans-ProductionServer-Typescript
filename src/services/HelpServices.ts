import query from "@utils/prisma";
import type { HelpCategoriesRespons } from "types/help";

class HelpService {
  static async GetHelpCategories(): Promise<HelpCategoriesRespons> {
    try {
      const categories = await query.helpCategory.findMany();
      return {
        error: false,
        message: "success",
        data: categories,
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }
}

export default HelpService;
