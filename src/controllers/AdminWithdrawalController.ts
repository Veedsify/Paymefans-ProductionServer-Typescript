import type { Request, Response } from "express";
import WithdrawalService from "@services/WithdrawalService";

export default class AdminWithdrawalController {
  /**
   * Reject a withdrawal request and restore points to user
   */
  static async rejectWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { withdrawal_id, user_id, amount, reason } = req.body;

      const result = await WithdrawalService.rejectWithdrawal({
        withdrawal_id: parseInt(withdrawal_id),
        user_id,
        amount: Number(amount),
        reason,
      });

      res.status(200).json({
        error: false,
        message: "Withdrawal rejected and points restored successfully",
        data: {
          withdrawal_id: result.withdrawal.id,
          user_id: result.user.user_id,
          user_name: result.user.name,
          user_email: result.user.email,
          points_restored: result.pointsRestored,
          new_balance: result?.userPoints?.points,
          status: result.withdrawal.status,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error("Withdrawal rejection error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to reject withdrawal: " + err.message,
      });
    }
  }

  /**
   * Approve a withdrawal request
   */
  static async approveWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { withdrawal_id, transfer_code, reference } = req.body;

      const result = await WithdrawalService.approveWithdrawal({
        withdrawal_id: parseInt(withdrawal_id),
        transfer_code,
        reference,
      });

      console.log("Withdrawal approval completed:", {
        withdrawal_id: result.withdrawal.id,
        user: result.user.email,
        status: result.withdrawal.status,
      });

      res.status(200).json({
        error: false,
        message: "Withdrawal approved successfully",
        data: {
          withdrawal_id: result.withdrawal.id,
          user_id: result.user.user_id,
          user_name: result.user.name,
          user_email: result.user.email,
          status: result.withdrawal.status,
          transfer_code: result.withdrawal.transfer_code,
          reference: result.withdrawal.reference,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err: any) {
      console.error("Withdrawal approval error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to approve withdrawal: " + err.message,
      });
    }
  }

  /**
   * Get withdrawal request details by ID
   */
  static async getWithdrawal(req: Request, res: Response): Promise<void> {
    try {
      const { withdrawal_id } = req.params;

      if (!withdrawal_id) {
        res.status(400).json({
          error: true,
          message: "withdrawal_id is required",
        });
        return;
      }

      const withdrawal = await WithdrawalService.getWithdrawalById(
        parseInt(withdrawal_id)
      );

      if (!withdrawal) {
        res.status(404).json({
          error: true,
          message: "Withdrawal request not found",
        });
        return;
      }

      res.status(200).json({
        error: false,
        data: withdrawal,
      });
    } catch (err: any) {
      console.error("Get withdrawal error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to get withdrawal: " + err.message,
      });
    }
  }

  /**
   * Get all withdrawal requests with pagination and filters
   */
  static async getWithdrawals(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = "1",
        limit = "10",
        status,
        user_id,
      } = req.query;

      const result = await WithdrawalService.getWithdrawals({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as string,
        userId: user_id as string,
      });

      res.status(200).json({
        error: false,
        data: result.withdrawals,
        pagination: result.pagination,
      });
    } catch (err: any) {
      console.error("Get withdrawals error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to get withdrawals: " + err.message,
      });
    }
  }

  /**
   * Get withdrawal statistics
   */
  static async getWithdrawalStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await WithdrawalService.getWithdrawals({
        page: 1,
        limit: 1,
      });

      // Get status-based counts
      const [pending, completed, rejected] = await Promise.all([
        WithdrawalService.getWithdrawals({ page: 1, limit: 1, status: "pending" }),
        WithdrawalService.getWithdrawals({ page: 1, limit: 1, status: "completed" }),
        WithdrawalService.getWithdrawals({ page: 1, limit: 1, status: "rejected" }),
      ]);

      res.status(200).json({
        error: false,
        data: {
          total: stats.pagination.total,
          pending: pending.pagination.total,
          completed: completed.pagination.total,
          rejected: rejected.pagination.total,
        },
      });
    } catch (err: any) {
      console.error("Get withdrawal stats error:", err);
      res.status(500).json({
        error: true,
        message: "Failed to get withdrawal statistics: " + err.message,
      });
    }
  }
}
