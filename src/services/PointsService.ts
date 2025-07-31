import query from "@utils/prisma";

interface UpdatePointsData {
  user_id: string;
  points: number;
  operation: "add" | "subtract";
}

interface UserPointsInfo {
  user_id: string;
  name: string;
  email: string;
  points: number;
  conversion_rate: number;
  last_updated: Date | null;
}

interface PointsUpdateResult {
  user_id: string;
  user_name: string;
  user_email: string;
  points: number;
  operation: string;
  amount: number;
}

export default class PointsService {
  /**
   * Update user points (add or subtract)
   */
  static async updateUserPoints(
    data: UpdatePointsData,
  ): Promise<PointsUpdateResult> {
    const { user_id, points, operation } = data;

    if (!user_id || points === undefined || points < 0) {
      throw new Error("user_id and valid points amount are required");
    }

    if (!["add", "subtract"].includes(operation)) {
      throw new Error("operation must be 'add' or 'subtract'");
    }

    // Find user by user_id string
    const user = await query.user.findFirst({
      where: {
        user_id: user_id,
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Use transaction to ensure data consistency
    const result = await query.$transaction(async (tx) => {
      // Find or create user points
      let userPoints = await tx.userPoints.findFirst({
        where: {
          user_id: user.id,
        },
      });

      if (!userPoints) {
        // Create new user points record
        const initialPoints = operation === "add" ? points : 0;
        userPoints = await tx.userPoints.create({
          data: {
            user_id: user.id,
            points: initialPoints,
            conversion_rate: 1.0,
          },
        });
      } else {
        // Update existing points
        const newPoints =
          operation === "add"
            ? userPoints.points + points
            : Math.max(0, userPoints.points - points);

        userPoints = await tx.userPoints.update({
          where: {
            user_id: user.id,
          },
          data: {
            points: newPoints,
            updated_at: new Date(),
          },
        });
      }

      return userPoints;
    });

    return {
      user_id: user_id,
      user_name: user.name,
      user_email: user.email,
      points: result.points,
      operation: operation,
      amount: points,
    };
  }

  /**
   * Get user points balance by user_id
   */
  static async getUserPointsBalance(user_id: string): Promise<UserPointsInfo> {
    if (!user_id) {
      throw new Error("user_id is required");
    }

    // Find user by user_id string
    const user = await query.user.findFirst({
      where: {
        user_id: user_id,
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        email: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Get user points
    const userPoints = await query.userPoints.findFirst({
      where: {
        user_id: user.id,
      },
    });

    return {
      user_id: user.user_id,
      name: user.name,
      email: user.email,
      points: userPoints?.points || 0,
      conversion_rate: userPoints?.conversion_rate || 1.0,
      last_updated: userPoints?.updated_at || null,
    };
  }

  /**
   * Get multiple users' points balances
   */
  static async getMultipleUsersPointsBalance(
    user_ids: string[],
  ): Promise<UserPointsInfo[]> {
    if (!user_ids || user_ids.length === 0) {
      throw new Error("user_ids array is required");
    }

    const users = await query.user.findMany({
      where: {
        user_id: {
          in: user_ids,
        },
      },
      select: {
        id: true,
        user_id: true,
        name: true,
        email: true,
      },
    });

    const results = await Promise.all(
      users.map(async (user) => {
        const userPoints = await query.userPoints.findFirst({
          where: { user_id: user.id },
        });
        return {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          points: userPoints?.points || 0,
          conversion_rate: userPoints?.conversion_rate || 1.0,
          last_updated: userPoints?.updated_at || null,
        };
      }),
    );

    return results;
  }

  /**
   * Transfer points between users
   */
  static async transferPoints(
    fromUserId: string,
    toUserId: string,
    points: number,
  ): Promise<{ from: PointsUpdateResult; to: PointsUpdateResult }> {
    if (!fromUserId || !toUserId || !points || points <= 0) {
      throw new Error(
        "fromUserId, toUserId, and valid points amount are required",
      );
    }

    if (fromUserId === toUserId) {
      throw new Error("Cannot transfer points to the same user");
    }

    // Check if sender has enough points
    const senderBalance = await this.getUserPointsBalance(fromUserId);
    if (senderBalance.points < points) {
      throw new Error("Insufficient points balance");
    }

    // Perform transfer in transaction
    const result = await query.$transaction(async () => {
      const from = await this.updateUserPoints({
        user_id: fromUserId,
        points,
        operation: "subtract",
      });

      const to = await this.updateUserPoints({
        user_id: toUserId,
        points,
        operation: "add",
      });

      return { from, to };
    });

    return result;
  }

  /**
   * Get user points transaction history
   */
  static async getUserPointsHistory(
    user_id: string,
    options: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 10 } = options;
    const skip = (page - 1) * limit;

    const user = await query.user.findFirst({
      where: { user_id },
      select: { id: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const [transactions, total] = await Promise.all([
      query.userPointsPurchase.findMany({
        where: { user_id: user.id },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      query.userPointsPurchase.count({
        where: { user_id: user.id },
      }),
    ]);

    return {
      transactions,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get points statistics
   */
  static async getPointsStatistics() {
    const [totalUsers, totalPoints, activeUsers] = await Promise.all([
      query.userPoints.count(),
      query.userPoints.aggregate({
        _sum: { points: true },
      }),
      query.userPoints.count({
        where: {
          points: { gt: 0 },
        },
      }),
    ]);

    return {
      total_users_with_points: totalUsers,
      total_points_in_system: totalPoints._sum.points || 0,
      active_users_with_points: activeUsers,
    };
  }
}
