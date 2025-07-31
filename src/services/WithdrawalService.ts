import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import ConfigService from "@services/ConfigService";
import query from "@utils/prisma";

interface WithdrawalRejectionData {
  withdrawal_id: number;
  user_id: string;
  amount: number;
  reason?: string;
}

interface WithdrawalApprovalData {
  withdrawal_id: number;
  transfer_code?: string;
  reference?: string;
}

interface WithdrawalRejectionResult {
  withdrawal: any;
  userPoints: any;
  user: any;
  pointsRestored: number;
}

interface WithdrawalApprovalResult {
  withdrawal: any;
  user: any;
}

export default class WithdrawalService {
  /**
   * Reject a withdrawal request and restore points to user
   */
  static async rejectWithdrawal(
    data: WithdrawalRejectionData
  ): Promise<WithdrawalRejectionResult> {
    const { withdrawal_id, user_id, amount, reason } = data;

    if (!withdrawal_id || !user_id || !amount) {
      throw new Error("withdrawal_id, user_id, and amount are required");
    }

    // Start transaction to ensure consistency
    const result = await query.$transaction(async (tx) => {
      // Find the withdrawal request
      const withdrawal = await tx.withdrawalRequest.findFirst({
        where: {
          id: withdrawal_id,
        },
        include: {
          user: {
            select: {
              id: true,
              user_id: true,
              name: true,
              email: true,
              UserWallet: true,
            },
          },
        },
      });

      if (!withdrawal) {
        throw new Error("Withdrawal request not found");
      }

      // Update withdrawal status to rejected
      const updatedWithdrawal = await tx.withdrawalRequest.update({
        where: {
          id: withdrawal_id,
        },
        data: {
          status: "rejected",
          reason: reason,
          updated_at: new Date(),
        },
      });

      // Restore points to user
      const pointsRestored = await this.restorePointsToUser(
        tx,
        withdrawal.user.id,
        amount,
        withdrawal.user.UserWallet?.id
      );

      return {
        withdrawal: updatedWithdrawal,
        userPoints: pointsRestored.userPoints,
        user: withdrawal.user,
        pointsRestored: pointsRestored.points,
      };
    });

    return result;
  }

  /**
   * Approve a withdrawal request
   */
  static async approveWithdrawal(
    data: WithdrawalApprovalData
  ): Promise<WithdrawalApprovalResult> {
    const { withdrawal_id, transfer_code, reference } = data;

    if (!withdrawal_id) {
      throw new Error("withdrawal_id is required");
    }

    // Update withdrawal status to completed
    const updatedWithdrawal = await query.withdrawalRequest.update({
      where: {
        id: withdrawal_id,
      },
      data: {
        status: "completed",
        transfer_code: transfer_code || null,
        reference: reference || null,
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            user_id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return {
      withdrawal: updatedWithdrawal,
      user: updatedWithdrawal.user,
    };
  }

  /**
   * Restore points to user when withdrawal is rejected
   */
  private static async restorePointsToUser(
    tx: any,
    userId: number,
    amount: number,
    walletId?: number
  ): Promise<{ userPoints: any; points: number }> {
    let userPoints = await tx.userPoints.findFirst({
      where: {
        user_id: userId,
      },
    });

    const referenceId = `PNT${GenerateUniqueId()}`;
    const config = await ConfigService.Config();
    const pointConversionRate = Number(
      config?.data?.point_conversion_rate_ngn
    );
    const points = Number(amount / pointConversionRate);

    if (!userPoints) {
      if (pointConversionRate) {
        // Create new user points record
        await tx.userPointsPurchase.create({
          data: {
            user_id: userId,
            points: Number(points),
            amount: parseInt(amount.toString()),
            purchase_id: referenceId,
          },
        });
      }
    } else {
      // Update existing points
      userPoints = await tx.userPoints.update({
        where: {
          user_id: userId,
        },
        data: {
          points: {
            increment: Number(points),
          },
          updated_at: new Date(),
        },
      });

      // Create transaction record
      if (walletId) {
        await tx.userTransaction.create({
          data: {
            wallet_id: Number(walletId),
            user_id: userId,
            transaction_type: "credit",
            transaction_message: `Your Withdrawal Request Was Not Approved We have Refunded ₦ ${Number(amount).toLocaleString()}, Back to your wallet`,
            amount: Number(points),
            transaction_id: referenceId,
            transaction: `Your Withdrawal Request Was Not Approved We have Refunded ₦ ${Number(amount).toLocaleString()}, Back to your wallet`,
          },
        });
      }
    }

    return { userPoints, points };
  }

  /**
   * Get withdrawal request by ID
   */
  static async getWithdrawalById(withdrawalId: number) {
    return await query.withdrawalRequest.findFirst({
      where: {
        id: withdrawalId,
      },
      include: {
        user: {
          select: {
            id: true,
            user_id: true,
            name: true,
            email: true,
            UserWallet: true,
          },
        },
      },
    });
  }

  /**
   * Get withdrawal requests with pagination and filters
   */
  static async getWithdrawals(options: {
    page?: number;
    limit?: number;
    status?: string;
    userId?: string;
  }) {
    const { page = 1, limit = 10, status, userId } = options;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (status) where.status = status;
    if (userId) {
      const user = await query.user.findFirst({
        where: { user_id: userId },
        select: { id: true },
      });
      if (user) where.user_id = user.id;
    }

    const [withdrawals, total] = await Promise.all([
      query.withdrawalRequest.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      query.withdrawalRequest.count({ where }),
    ]);

    return {
      withdrawals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
