import SearchService from "@services/SearchService";
import { Request, Response } from "express";
import { AuthUser } from "types/user";

export default class SearchController {
    static async SearchPlatform(req: Request, res: Response): Promise<any> {
        try {
            const query = req.query.query as string;
            if (!query || query.trim() === "") {
                return res.status(400).json({ error: "Query parameter is required" });
            }
            if (!req.query.category || !["posts", "users", "media"].includes(req.query.category as string)) {
                return res.status(400).json({ error: "Invalid or missing category parameter" });
            }
            const results = await SearchService.SearchPlatform(
                decodeURIComponent(query),
                req.query.category as string,
                req.user as AuthUser
            )

            if (results.error) {
                return res.status(400).json({ error: results.error });
            }
            return res.status(200).json(results);
        } catch (error) {
            console.error("Error in SearchController.SearchPlatform:", error);
            return res.status(500).json({ error: "Internal Server Error" });
        }
    }
}
