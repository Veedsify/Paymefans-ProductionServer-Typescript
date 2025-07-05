import type { Request, Response } from "express";
import PointsService from "@services/PointsService";

export default class AdminPointsController {
  /**
   * Update user points (Admin endpoint)
   */
  static async UpdateUserPoints(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, points, operation = "add" } = req.body;

      console.log("UpdateUserPoints called with:", {
        user_id,
        points,
        operation,
      });

      const result = await PointsService.updateUserPoints({
        user_id,
        points,
        operation,
      });

      console.log("Points update result:", result);

      const response = {
        error: false,
        message: `User points ${operation === "add" ? "added" : "deducted"} successfully`,
        data: {
          ...result,
          timestamp: new Date().toISOString(),
        },
      };

      console.log("Sending response:", response);

      res.status(200).json(response);
    } catch (err: any) {
      console.error("UpdateUserPoints error:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong updating user points",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }

  /**
   * Get user points balance (Admin endpoint)
   */
  static async GetUserPointsBalance(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { user_id } = req.params;

      console.log("GetUserPointsBalance called for user_id:", user_id);

      const userInfo = await PointsService.getUserPointsBalance(user_id);

      console.log("User points info:", userInfo);

      const response = {
        error: false,
        points: userInfo.points,
        conversion_rate: userInfo.conversion_rate,
        user_info: {
          user_id: userInfo.user_id,
          name: userInfo.name,
          email: userInfo.email,
        },
        last_updated: userInfo.last_updated,
      };

      console.log("Sending balance response:", response);

      res.status(200).json(response);
    } catch (err: any) {
      console.error("GetUserPointsBalance error:", err);
      console.error("Error stack:", err.stack);
      res.status(500).json({
        error: true,
        message:
          err.message || "Something went wrong getting user points balance",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }

  /**
   * Get points statistics (Admin endpoint)
   */
  static async GetPointsStatistics(_: Request, res: Response): Promise<void> {
    try {
      const stats = await PointsService.getPointsStatistics();

      res.status(200).json({
        error: false,
        data: stats,
      });
    } catch (err: any) {
      console.error("GetPointsStatistics error:", err);
      res.status(500).json({
        error: true,
        message:
          err.message || "Something went wrong getting points statistics",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }

  /**
   * Get user points history (Admin endpoint)
   */
  static async GetUserPointsHistory(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { user_id } = req.params;
      const { page = "1", limit = "10" } = req.query;

      const result = await PointsService.getUserPointsHistory(user_id, {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      res.status(200).json({
        error: false,
        data: result.transactions,
        pagination: result.pagination,
      });
    } catch (err: any) {
      console.error("GetUserPointsHistory error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong getting points history",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }

  /**
   * Transfer points between users (Admin endpoint)
   */
  static async TransferPoints(req: Request, res: Response): Promise<void> {
    try {
      const { from_user_id, to_user_id, points } = req.body;

      if (!from_user_id || !to_user_id || !points || points <= 0) {
        res.status(400).json({
          error: true,
          message:
            "from_user_id, to_user_id, and valid points amount are required",
        });
        return;
      }

      const result = await PointsService.transferPoints(
        from_user_id,
        to_user_id,
        points,
      );

      res.status(200).json({
        error: false,
        message: "Points transferred successfully",
        data: {
          transfer: {
            from: result.from,
            to: result.to,
            amount: points,
          },
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error("TransferPoints error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong transferring points",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }

  /**
   * Get multiple users' points balances (Admin endpoint)
   */
  static async GetMultipleUsersPoints(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { user_ids } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        res.status(400).json({
          error: true,
          message: "user_ids array is required",
        });
        return;
      }

      const users = await PointsService.getMultipleUsersPointsBalance(user_ids);

      res.status(200).json({
        error: false,
        data: users,
      });
    } catch (err: any) {
      console.error("GetMultipleUsersPoints error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong getting users' points",
        debug: process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }
  }
}
