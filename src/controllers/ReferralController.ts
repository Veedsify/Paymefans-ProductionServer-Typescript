import ReferralService from "@services/ReferralService";
import type { Request, Response } from "express";

export default class ReferralController {
  /**
   * Get referral statistics for the authenticated user
   */
  static async getReferralStats(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
          status: false,
        });
      }

      const stats = await ReferralService.getReferralStats(userId);
      return res.status(200).json(stats);
    } catch (error: any) {
      console.error("Error in getReferralStats:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }

  /**
   * Get paginated list of referred users
   */
  static async getReferredUsers(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
          status: false,
        });
      }

      const cursor = req.query.cursor
        ? parseInt(req.query.cursor as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const users = await ReferralService.getReferredUsers(
        userId,
        cursor,
        limit,
      );
      return res.status(200).json(users);
    } catch (error: any) {
      console.error("Error in getReferredUsers:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }

  /**
   * Get paginated list of referral earnings
   */
  static async getReferralEarnings(req: Request, res: Response): Promise<any> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({
          error: "Unauthorized",
          status: false,
        });
      }

      const cursor = req.query.cursor
        ? parseInt(req.query.cursor as string)
        : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const earnings = await ReferralService.getReferralEarnings(
        userId,
        cursor,
        limit,
      );
      return res.status(200).json(earnings);
    } catch (error: any) {
      console.error("Error in getReferralEarnings:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }

  /**
   * Create a referral relationship
   */
  static async createReferral(req: Request, res: Response): Promise<any> {
    try {
      const { referralCode, referredUserId } = req.body;

      if (!referralCode || !referredUserId) {
        return res.status(400).json({
          error: "Referral code and referred user ID are required",
          status: false,
        });
      }

      // Validate the referral code and get referrer
      const validation =
        await ReferralService.validateReferralCode(referralCode);
      if (!validation.status || !validation.referrerId) {
        return res.status(400).json({
          error: validation.message,
          status: false,
        });
      }

      // Create the referral
      const result = await ReferralService.createReferral(
        validation.referrerId,
        referredUserId,
        referralCode,
      );

      if (!result.status) {
        return res.status(400).json(result);
      }

      // Add referral earnings (example: 50 points for a successful referral)
      const earningsResult = await ReferralService.addReferralEarnings(
        validation.referrerId,
        10,
        `Referral bonus for @${referredUserId}`,
        "referrer",
      );

      return res.status(200).json({
        ...result,
        earningsAdded: earningsResult.status,
      });
    } catch (error: any) {
      console.error("Error in createReferral:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }

  /**
   * Validate a referral code
   */
  static async validateReferralCode(req: Request, res: Response): Promise<any> {
    try {
      const { code } = req.query;

      if (!code || typeof code !== "string") {
        return res.status(400).json({
          error: "Referral code is required",
          status: false,
        });
      }

      const validation = await ReferralService.validateReferralCode(code);
      return res.status(200).json(validation);
    } catch (error: any) {
      console.error("Error in validateReferralCode:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }

  /**
   * Add referral earnings manually (admin function)
   */
  static async addReferralEarnings(req: Request, res: Response): Promise<any> {
    try {
      const { userId, points, description } = req.body;

      if (!userId || !points || !description) {
        return res.status(400).json({
          error: "User ID, points, and description are required",
          status: false,
        });
      }

      const result = await ReferralService.addReferralEarnings(
        userId,
        points,
        description,
        "referrer",
      );
      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Error in addReferralEarnings:", error);
      return res.status(500).json({
        error: error.message || "Internal server error",
        status: false,
      });
    }
  }
}
