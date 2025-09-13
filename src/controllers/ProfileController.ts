import type { Request, Response } from "express";
import ProfileService from "@services/ProfileService";
import { AuthUser } from "types/user";

class ProfileController {
  // Load Profile
  static async Profile(req: Request, res: Response): Promise<any> {
    try {
      const authUserId = req.user?.id as number;
      const username = req.body.username as string;
      if (!username) {
        return res
          .status(400)
          .json({ message: "Username is required", status: false });
      }
      const user = await ProfileService.Profile(username, authUserId);
      if (!user || !user.status) {
        return res.status(400).json(user);
      }
      res.json(user);
    } catch (error) {
      console.error("Profile error:", error);
      res.status(500).json({ error: "Error fetching profile" });
    }
  }

  //Banner Change
  static async BannerChange(req: Request, res: Response): Promise<any> {
    try {
      const user = await ProfileService.BannerChange(req);
      res.json(user);
    } catch (error) {
      console.error("Banner error:", error);
      res.status(500).json({ error: "Error changing banner" });
    }
  }

  //Avatar Change
  static async ProfileUpdate(req: Request, res: Response): Promise<any> {
    try {
      const user = await ProfileService.ProfileUpdate(req);
      if (user.error) {
        return res.status(400).json(user);
      }
      res.json(user);
    } catch (error) {
      console.error("Avatar error:", error);
      res.status(500).json({ error: "Error changing avatar" });
    }
  }

  // Profile Stats
  static async ProfileStats(req: Request, res: Response): Promise<any> {
    try {
      const stats = await ProfileService.ProfileStats({
        user: req.user as AuthUser,
        type: req.params.type as "followers" | "subscribers" | "following",
        limit: Number(req.query.limit) as number,
        cursor: Number(req.query.cursor as string) as number,
        query: String(req.query.query),
      });

      if (stats.error) {
        return res.status(400).json(stats);
      }

      res.status(200).json(stats);
    } catch (error: any) {
      console.log("Profile stats error:", error);
      res.status(500).json({
        error: true,
        message: error.message,
      });
    }
  }

  // Follow/Unfollow User
  static async FollowUnfollowUser(req: Request, res: Response): Promise<any> {
    try {
      const user = await ProfileService.FollowUnfollowUser(
        req.user!,
        req.params.action as "follow" | "unfollow",
        Number(req.params.userId) as number,
      );
      res.status(200).json(user);
    } catch (error) {
      console.error("Follow/Unfollow error:", error);
      res.status(500).json({ error: "Error following/unfollowing user" });
    }
  }
  // Tip User
  static async TipUser(req: Request, res: Response): Promise<any> {
    try {
      const user = await ProfileService.TipUser({
        user: req.user!,
        point_buy_id: String(req.body.id) as string,
        modelId: Number(req.body.modelId) as number,
      });
      res.status(200).json(user);
    } catch (error) {
      console.error("Tip error:", error);
      res.status(500).json({ error: "Error tipping user" });
    }
  }

  // Delete Account
  static async DeleteAccount(req: Request, res: Response): Promise<any> {
    try {
      const { password } = req.body;

      // Validate password is provided
      if (!password) {
        return res.status(400).json({
          message: "Password is required to confirm account deletion",
          error: true,
        });
      }

      const user = await ProfileService.DeleteAccount(req.user!.id, password);
      if (user.error) {
        return res.status(400).json(user);
      }
      res.status(200).json(user);
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Error deleting account" });
    }
  }

  // Creator Dashboard Data
  static async CreatorDashboardData(req: Request, res: Response): Promise<any> {
    try {
      const data = await ProfileService.CreatorDashboardData(req.user!.id);
      if (data.error) {
        return res.status(400).json(data);
      }
      res.status(200).json(data);
    } catch (error) {
      console.error("Creator Dashboard Data error:", error);
      res.status(500).json({ error: "Error fetching creator dashboard data" });
    }
  }
}

export default ProfileController;
