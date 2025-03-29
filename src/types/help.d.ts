import { HelpCategory } from "@prisma/client";

export type HelpCategoriesRespons = {
      error: boolean;
      message: string;
      data: HelpCategory[]
}
