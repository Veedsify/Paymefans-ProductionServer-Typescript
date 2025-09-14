import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import query from "@utils/prisma";

export interface ReferralUser {
  id: number;
  name: string;
  username: string;
  profile_image: string;
  created_at: Date;
  earnings: number;
}

export interface ReferralEarning {
  id: number;
  points: number;
  description: string;
  created_at: Date;
  referredUser?: {
    name: string;
    username: string;
    profile_image: string;
  } | null;
}

export interface ReferralStatsResponse {
  totalEarnings: number;
  totalReferrals: number;
  referralCode: string;
  status: boolean;
}

export interface ReferralUsersResponse {
  users: ReferralUser[];
  hasMore: boolean;
  nextCursor: number | null;
  status: boolean;
}

export interface ReferralEarningsResponse {
  earnings: ReferralEarning[];
  hasMore: boolean;
  nextCursor: number | null;
  status: boolean;
}

export default class ReferralService {
  /**
   * Get referral statistics for a user
   */
  static async getReferralStats(
    userId: number,
  ): Promise<ReferralStatsResponse> {
    try {
      // Get total earnings from referrals
      const totalEarningsResult = await query.referralEarnings.aggregate({
        where: {
          user_id: userId,
        },
        _sum: {
          points: true,
        },
      });

      // Get total number of referrals
      const totalReferrals = await query.referrals.count({
        where: {
          user_id: userId,
        },
      });

      // Get user details for referral code
      const user = await query.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          user_id: true,
        },
      });

      const referralCode = user ? `PF-${user.user_id}` : "";
      const totalEarnings = totalEarningsResult._sum.points || 0;

      return {
        totalEarnings,
        totalReferrals,
        referralCode,
        status: true,
      };
    } catch (error: any) {
      console.error("Error fetching referral stats:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Get paginated list of referred users
   */
  static async getReferredUsers(
    userId: number,
    cursor?: number,
    limit: number = 10,
  ): Promise<ReferralUsersResponse> {
    try {
      const whereClause: any = {
        user_id: userId,
      };

      if (cursor) {
        whereClause.id = {
          gt: cursor,
        };
      }

      const referrals = await query.referrals.findMany({
        where: whereClause,
        include: {
          referral: {
            select: {
              id: true,
              name: true,
              username: true,
              profile_image: true,
              created_at: true,
            },
          },
        },
        orderBy: {
          id: "asc",
        },
        take: limit + 1, // Take one extra to check if there are more
      });

      const hasMore = referrals.length > limit;
      const users = referrals.slice(0, limit);

      // Get earnings for each referred user
      const usersWithEarnings = await Promise.all(
        users.map(async (referral) => {
          const earnings = await query.referralEarnings.aggregate({
            where: {
              user_id: userId,
              description: {
                contains: referral.referral.username,
              },
            },
            _sum: {
              points: true,
            },
          });

          return {
            id: referral.referral.id,
            name: referral.referral.name,
            username: referral.referral.username,
            profile_image:
              referral.referral.profile_image || "/site/avatar.png",
            created_at: referral.referral.created_at,
            earnings: earnings._sum.points || 0,
          };
        }),
      );

      const nextCursor = hasMore ? users[users.length - 1]?.id || null : null;

      return {
        users: usersWithEarnings,
        hasMore,
        nextCursor,
        status: true,
      };
    } catch (error: any) {
      console.error("Error fetching referred users:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Get paginated list of referral earnings
   */
  static async getReferralEarnings(
    userId: number,
    cursor?: number,
    limit: number = 10,
  ): Promise<ReferralEarningsResponse> {
    try {
      const whereClause: any = {
        user_id: userId,
      };

      if (cursor) {
        whereClause.id = {
          gt: cursor,
        };
      }

      const earnings = await query.referralEarnings.findMany({
        where: whereClause,
        orderBy: {
          created_at: "desc",
        },
        take: limit + 1, // Take one extra to check if there are more
      });

      const hasMore = earnings.length > limit;
      const earningsData = earnings.slice(0, limit);

      // Try to extract referred user info from description
      const earningsWithUserInfo = await Promise.all(
        earningsData.map(async (earning) => {
          let referredUser = null;

          // Try to extract username from description
          const usernameMatch = earning.description.match(/@(\w+)/);
          if (usernameMatch) {
            const username = usernameMatch[1];
            const user = await query.user.findFirst({
              where: {
                username: username,
              },
              select: {
                name: true,
                username: true,
                profile_image: true,
              },
            });

            if (user) {
              referredUser = {
                name: user.name,
                username: user.username,
                profile_image: user.profile_image || "/site/avatar.png",
              };
            }
          }

          return {
            id: earning.id,
            points: earning.points,
            description: earning.description,
            created_at: earning.created_at,
            referredUser,
          };
        }),
      );

      const nextCursor = hasMore
        ? earningsData[earningsData.length - 1]?.id || null
        : null;

      return {
        earnings: earningsWithUserInfo,
        hasMore,
        nextCursor,
        status: true,
      };
    } catch (error: any) {
      console.error("Error fetching referral earnings:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Create a referral relationship
   */
  static async createReferral(
    referrerUserId: number,
    referredUserId: number,
    referralCode: string,
  ): Promise<{ status: boolean; message: string }> {
    try {
      // Check if referral already exists
      const existingReferral = await query.referrals.findFirst({
        where: {
          user_id: referrerUserId,
          referral_id: referredUserId,
        },
      });

      if (existingReferral) {
        return {
          status: false,
          message: "Referral relationship already exists",
        };
      }

      // Create the referral
      await query.referrals.create({
        data: {
          user_id: referrerUserId,
          referral_id: referredUserId,
          code: referralCode,
        },
      });

      return {
        status: true,
        message: "Referral created successfully",
      };
    } catch (error: any) {
      console.error("Error creating referral:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Add referral earnings
   */
  static async addReferralEarnings(
    userId: number,
    points: number,
    description: string,
    role: "referrer" | "model",
  ): Promise<{ status: boolean; message: string }> {
    try {
      // Create the earning record
      await query.referralEarnings.create({
        data: {
          user_id: userId,
          points: points,
          description: description,
        },
      });

      // Update user points
      const userpoints = await query.userPoints.upsert({
        where: {
          user_id: userId,
        },
        update: {
          points: {
            increment: points,
          },
        },
        create: {
          user_id: userId,
          points: points,
          conversion_rate: 1.0,
        },
        select: {
          user: {
            select: {
              UserWallet: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
      });
      const purchase_id = `TRN${GenerateUniqueId()}`;

      const optionsForSender = {
        transactionId: purchase_id,
        transaction:
          role === "referrer" ? "Referrer Earnings" : "Model Signup Bonus",
        userId: userId,
        amount: points,
        transactionType: "credit",
        transactionMessage:
          role === "referrer" ? "Referrer Earnings" : "Model Signup Bonus",
        walletId: userpoints?.user?.UserWallet?.id!,
      };

      await Promise.all([
        UserTransactionQueue.add("userTransaction", optionsForSender, {
          removeOnComplete: true,
          attempts: 3,
        }),
      ]);

      return {
        status: true,
        message: "Referral earnings added successfully",
      };
    } catch (error: any) {
      console.error("Error adding referral earnings:", error);
      throw new Error(error.message);
    }
  }

  /**
   * Validate referral code and get referrer
   */
  static async validateReferralCode(referralCode: string): Promise<{
    status: boolean;
    referrerId?: number;
    message: string;
  }> {
    try {
      // Extract user_id from referral code (format: PF-{user_id})
      const userIdMatch = referralCode.match(/^PF-(.+)$/);
      if (!userIdMatch) {
        return {
          status: false,
          message: "Invalid referral code format",
        };
      }

      const userId = userIdMatch[1];

      console.log("Matching this id", userId);

      // Find the user with this user_id
      const user = await query.user.findFirst({
        where: {
          user_id: userId,
        },
        select: {
          id: true,
          is_model: true,
        },
      });

      if (!user) {
        return {
          status: false,
          message: "Referral code not found",
        };
      }

      if (!user.is_model) {
        return {
          status: false,
          message: "Only models can have referral codes",
        };
      }

      return {
        status: true,
        referrerId: user.id,
        message: "Valid referral code",
      };
    } catch (error: any) {
      console.error("Error validating referral code:", error);
      throw new Error(error.message);
    }
  }
}
