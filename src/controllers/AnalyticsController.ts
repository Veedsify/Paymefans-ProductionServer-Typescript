import type { Request, Response } from "express";
import AnalyticsService from "@services/AnalyticsService";
import { AuthUser } from "types/user";

type TimeRangeKey =
  | "24hrs"
  | "48hrs"
  | "3days"
  | "7days"
  | "1month"
  | "3months"
  | "6months"
  | "alltime";

class AnalyticsController {
  // Get Profile Views Data
  static async GetProfileViews(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const days = parseInt(req.params.days, 30);
      const data = await AnalyticsService.GetProfileViewsData(user.id, days);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Profile views error:", error);
      res.status(500).json({ error: "Error fetching profile views data" });
    }
  }

  // Get Account Growth Data
  static async GetAccountGrowth(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const timeRange = req.params.timeRange as TimeRangeKey;

      const data = await AnalyticsService.GetAccountGrowthData(
        user.id,
        timeRange,
      );
      res.json({ success: true, data });
    } catch (error) {
      console.error("Account growth error:", error);
      res.status(500).json({ error: "Error fetching account growth data" });
    }
  }

  // Get Engagement Data
  static async GetEngagement(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const timeRange = req.params.timeRange as TimeRangeKey;

      const data = await AnalyticsService.GetEngagementData(user.id, timeRange);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Engagement error:", error);
      res.status(500).json({ error: "Error fetching engagement data" });
    }
  }

  // Get Audience Demographics
  static async GetAudience(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;

      const data = await AnalyticsService.GetAudienceData(user.id);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Audience error:", error);
      res.status(500).json({ error: "Error fetching audience data" });
    }
  }

  // Get Recent Posts Performance
  static async GetRecentPosts(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const timeRange = req.params.timeRange as TimeRangeKey;
      const data = await AnalyticsService.GetRecentPostsData(
        user.id,
        timeRange,
      );
      res.json({ success: true, data });
    } catch (error) {
      console.error("Recent posts error:", error);
      res.status(500).json({ error: "Error fetching recent posts data" });
    }
  }

  // Get Metrics Summary
  static async GetMetrics(req: Request, res: Response): Promise<any> {
    try {
      const user = req.user as AuthUser;
      const timeRange = req.params.timeRange as TimeRangeKey;

      const data = await AnalyticsService.GetMetricsData(user.id, timeRange);
      res.json({ success: true, data });
    } catch (error) {
      console.error("Metrics error:", error);
      res.status(500).json({ error: "Error fetching metrics data" });
    }
  }
}

export default AnalyticsController;
