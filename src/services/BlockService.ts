import query from "@utils/prisma";
import type {
  BlockUserProps,
  UnblockUserProps,
  CheckBlockStatusProps,
  GetBlockedUsersProps,
  BlockUserResponse,
  UnblockUserResponse,
  CheckBlockStatusResponse,
  GetBlockedUsersResponse,
} from "../types/block";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";

export default class BlockService {
  // Block a user
  static async BlockUser(
    userId: number,
    body: BlockUserProps,
  ): Promise<BlockUserResponse> {
    try {
      const { blockedId } = body;

      // Check if user is trying to block themselves
      if (userId === blockedId) {
        return {
          status: false,
          message: "You cannot block yourself",
          error: true,
        };
      }

      // Check if the user to be blocked exists
      const targetUser = await query.user.findUnique({
        where: { id: blockedId },
        select: { id: true, admin: true },
      });

      if (!targetUser) {
        return {
          status: false,
          message: "User not found",
          error: true,
        };
      }

      if (targetUser.admin) {
        return {
          status: false,
          message: "You cannot block this user",
          error: true,
        };
      }

      // Check if already blocked
      const existingBlock = await query.userBlock.findFirst({
        where: {
          blocker_id: userId,
          blocked_id: blockedId,
        },
      });

      if (existingBlock) {
        return {
          status: false,
          message: "User is already blocked",
          error: true,
        };
      }

      // Create block record
      const blockId = `BLK${GenerateUniqueId()}`;
      await query.userBlock.create({
        data: {
          block_id: blockId,
          blocker_id: userId,
          blocked_id: blockedId,
        },
      });

      // Remove any existing follow relationship (both ways)
      await query.$transaction(async (tx) => {
        // Remove if blocker follows blocked user
        await tx.follow.deleteMany({
          where: {
            user_id: blockedId,
            follower_id: userId,
          },
        });

        // Remove if blocked user follows blocker
        await tx.follow.deleteMany({
          where: {
            user_id: userId,
            follower_id: blockedId,
          },
        });

        // Update follower counts
        const blockerFollowing = await tx.follow.count({
          where: { follower_id: userId },
        });

        const blockerFollowers = await tx.follow.count({
          where: { user_id: userId },
        });

        const blockedFollowing = await tx.follow.count({
          where: { follower_id: blockedId },
        });

        const blockedFollowers = await tx.follow.count({
          where: { user_id: blockedId },
        });

        await tx.user.update({
          where: { id: userId },
          data: {
            total_following: blockerFollowing,
            total_followers: blockerFollowers,
          },
        });

        await tx.user.update({
          where: { id: blockedId },
          data: {
            total_following: blockedFollowing,
            total_followers: blockedFollowers,
          },
        });
      });

      return {
        status: true,
        message: "User blocked successfully",
        error: false,
        blockId: blockId,
      };
    } catch (err: any) {
      console.error("Error blocking user:", err);
      return {
        status: false,
        message: "Failed to block user",
        error: true,
      };
    }
  }

  // Unblock a user
  static async UnblockUser(
    userId: number,
    body: UnblockUserProps,
  ): Promise<UnblockUserResponse> {
    try {
      const { blockedId } = body;

      // Find and delete the block record
      const deletedBlock = await query.userBlock.deleteMany({
        where: {
          blocker_id: userId,
          blocked_id: blockedId,
        },
      });

      if (deletedBlock.count === 0) {
        return {
          status: false,
          message: "User is not blocked",
          error: true,
        };
      }

      return {
        status: true,
        message: "User unblocked successfully",
        error: false,
      };
    } catch (err: any) {
      console.error("Error unblocking user:", err);
      return {
        status: false,
        message: "Failed to unblock user",
        error: true,
      };
    }
  }

  // Check if a user is blocked
  static async CheckBlockStatus(
    body: CheckBlockStatusProps,
  ): Promise<CheckBlockStatusResponse> {
    try {
      const { userId, targetUserId } = body;

      const blockRecord = await query.userBlock.findFirst({
        where: {
          blocker_id: userId,
          blocked_id: targetUserId,
        },
        select: {
          block_id: true,
        },
      });

      return {
        status: true,
        isBlocked: !!blockRecord,
        blockId: blockRecord?.block_id,
        error: false,
      };
    } catch (err: any) {
      console.error("Error checking block status:", err);
      return {
        status: false,
        isBlocked: false,
        message: "Failed to check block status",
        error: true,
      };
    }
  }

  // Check if current user is blocked by another user
  static async CheckIfBlockedBy(
    userId: number,
    targetUserId: number,
  ): Promise<CheckBlockStatusResponse> {
    try {
      const blockRecord = await query.userBlock.findFirst({
        where: {
          blocker_id: targetUserId,
          blocked_id: userId,
        },
        select: {
          block_id: true,
        },
      });

      return {
        status: true,
        isBlocked: !!blockRecord,
        blockId: blockRecord?.block_id,
        error: false,
      };
    } catch (err: any) {
      console.error("Error checking if blocked by user:", err);
      return {
        status: false,
        isBlocked: false,
        message: "Failed to check block status",
        error: true,
      };
    }
  }

  // Get all blocked users
  static async GetBlockedUsers({
    query: bodyQuery,
    user,
  }: GetBlockedUsersProps): Promise<GetBlockedUsersResponse> {
    try {
      const min = parseInt(bodyQuery.min);
      const max = parseInt(bodyQuery.max);

      if (!min && !max) {
        return {
          status: false,
          error: true,
          message: "Min & Max Required",
          minmax: "",
          blockedUsers: [],
        };
      }

      const blockedUsers = [];
      const userBlocks = await query.userBlock.findMany({
        where: {
          blocker_id: user.id,
        },
        orderBy: {
          created_at: "desc",
        },
        skip: min === 0 ? 0 : min - 1,
        take: max,
        select: {
          block_id: true,
          blocked_id: true,
          created_at: true,
        },
      });

      for (let i = 0; i < userBlocks.length; i++) {
        const blockedUser = await query.user.findUnique({
          where: {
            id: userBlocks[i]?.blocked_id,
          },
          select: {
            id: true,
            username: true,
            name: true,
            profile_image: true,
          },
        });

        blockedUsers.push({
          user: blockedUser,
          blockId: userBlocks[i].block_id,
          created_at: userBlocks[i].created_at,
        });
      }

      const minmax = bodyQuery.min + " - " + bodyQuery.max;

      return {
        status: true,
        blockedUsers: blockedUsers,
        minmax,
        error: false,
        message: "Blocked users retrieved successfully",
      };
    } catch (error) {
      console.error("Error getting blocked users:", error);
      return {
        status: false,
        error: true,
        message: "An error occurred while getting blocked users",
        minmax: "",
        blockedUsers: [],
      };
    }
  }
}
