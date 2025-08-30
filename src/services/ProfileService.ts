import type { Request } from "express";
import type {
  BannerChangeResponse,
  ProfileDataItem,
  ProfileServiceResponse,
  ProfileStatsProps,
  ProfileStatsResponse,
  ProfileUpdateInfo,
  ProfileUpdateResponse,
} from "../types/profile";
import query from "@utils/prisma";
import { UploadImageToS3 } from "@libs/UploadImageToS3";
import type { UploadOptions } from "@libs/UploadImageToS3";
import { UpdateAvatarQueue } from "@jobs/UpdateCommentsAvatar";
import { redis } from "@libs/RedisStore";
import { AuthUser } from "types/user";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { UserNotificationQueue } from "@jobs/UserNotificaton";
import getSingleName from "@utils/GetSingleName";
import { UserTransactionQueue } from "@jobs/UserTransactionJob";
import { Permissions, RBAC } from "@utils/FlagsConfig";
import AutomatedMessageTriggerService from "./AutomatedMessageTriggerService";
import { SPECIAL_USERNAMES } from "@utils/SpecialUsernames";

class ProfileService {
  // Get Profile
  static async Profile(
    username: string,
    authUserId: number,
  ): Promise<ProfileServiceResponse> {
    try {
      if (!username)
        return {
          message: "User not found",
          status: false,
          user: undefined,
          profileImpressions: 0,
        };
      const user_name = username.replace(/%40/g, "@");
      const user = await query.user.findFirst({
        where: { username: user_name },
        select: {
          id: true,
          username: true,
          name: true,
          fullname: true,
          user_id: true,
          admin: true,
          role: true,
          is_active: true,
          is_model: true,
          is_verified: true,
          website: true,
          country: true,
          location: true,
          city: true,
          zip: true,
          active_status: true,
          show_active: true,
          post_watermark: true,
          total_followers: true,
          total_following: true,
          total_subscribers: true,
          email: true,
          profile_image: true,
          profile_banner: true,
          bio: true,
          flags: true,
          created_at: true,
          Settings: {
            select: {
              telegram_url: true,
              facebook_url: true,
              instagram_url: true,
              twitter_url: true,
              tiktok_url: true,
              youtube_url: true,
              snapchat_url: true,
            },
          },
          Subscribers: {
            select: { subscriber_id: true },
          },
        },
      });

      if (!user)
        return {
          message: "User not found",
          status: false,
          profileImpressions: 0,
        };

      const checkFlags = RBAC.checkUserFlag(
        user.flags,
        Permissions.PROFILE_HIDDEN,
      );

      if (checkFlags && user.id !== authUserId) {
        return {
          message: "User profile is hidden",
          status: false,
          profileImpressions: 0,
          user: undefined,
        };
      }
      // Check if either user has blocked the other
      const [theyBlockedMe] = await Promise.all([
        // query.userBlock.findFirst({
        //   where: { blocker_id: authUserId, blocked_id: user.id },
        // }),
        query.userBlock.findFirst({
          where: { blocker_id: user.id, blocked_id: authUserId },
        }),
      ]);

      // If the profile user blocked the requesting user, return user not found
      if (theyBlockedMe) {
        return {
          message: "User not found",
          status: false,
          profileImpressions: 0,
        };
      }

      // Batch follow checks
      const [iFollowThem, theyFollowMe] = await Promise.all([
        query.follow.findFirst({
          where: { follower_id: authUserId, user_id: user.id },
        }),
        query.follow.findFirst({
          where: { user_id: authUserId, follower_id: user.id },
        }),
      ]);

      const impression = await query.profileView.count({
        where: {
          profile_id: user.id,
        },
      });

      const response = {
        message: "User found",
        status: true,
        profileImpressions: impression,
        user: {
          ...user,
          isFollowing: !authUserId ? false : !!iFollowThem,
          followsYou: !authUserId ? false : !!theyFollowMe,
        },
      };
      return response;
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Change Banner
  static async BannerChange(req: Request): Promise<BannerChangeResponse> {
    const { user } = req;
    const file = req.file;
    let url = "";

    async function SaveBannerToDb(BannerUrl: string) {
      url = BannerUrl;
      await query.user.update({
        where: { id: user?.id },
        data: { profile_banner: BannerUrl },
      });
    }
    const options: UploadOptions = {
      file: file!,
      folder: "banners",
      contentType: "image/jpeg",
      resize: { width: 1950, height: 650, fit: "cover", position: "center" },
      deleteLocal: true,
      saveToDb: true,
      onUploadComplete: (BannerUrl: string) => SaveBannerToDb(BannerUrl),
      format: "webp",
      quality: 75,
    };
    await UploadImageToS3(options);
    return { message: "Banner updated", status: true, url };
  }

  static async ProfileUpdate(req: Request): Promise<ProfileUpdateResponse> {
    const { user } = req;
    const file = req.file;
    if (!user?.id) {
      return {
        message: "User not authenticated",
        status: false,
        url: "",
        error: true,
      };
    }

    try {
      if (!file) {
        const updateProfile = await this.ProfileUpdateInfo(req.body, user);
        return {
          error: updateProfile.error,
          message: updateProfile.error
            ? updateProfile.message
            : "Profile updated",
          status: !updateProfile.error,
          url: "",
        };
      }
      let AvatarUrl = "";
      const options: UploadOptions = {
        file: file,
        folder: "avatars",
        contentType: "image/jpeg",
        resize: { width: 200, height: 200, fit: "cover", position: "center" },
        deleteLocal: true,
        saveToDb: true,
        onUploadComplete: (url: string) => {
          AvatarUrl = url;
        },
        format: "webp",
        quality: 100,
      };
      await UploadImageToS3(options);
      if (!AvatarUrl) {
        return {
          message: "Failed to upload image",
          status: false,
          url: "",
          error: true,
        };
      }
      const updateProfile = await this.ProfileUpdateInfo(req.body, user);
      if (updateProfile.error) {
        return {
          message: updateProfile.message,
          status: false,
          url: "",
          error: true,
        };
      }

      await query.user.update({
        where: { id: user.id },
        data: { profile_image: AvatarUrl },
      });

      await UpdateAvatarQueue.add(
        "UpdateAvatarQueue",
        {
          userId: user.user_id,
          avatarUrl: AvatarUrl,
        },
        {
          attempts: 3,
          backoff: { type: "fixed", delay: 5000 },
          removeOnComplete: true,
        },
      );

      return {
        message: "Avatar updated",
        status: true,
        url: AvatarUrl,
        error: false,
      };
    } catch (error) {
      console.error("Profile update error:", error);
      throw new Error("Error updating profile");
    }
  }

  // Update Profile Info
  static async ProfileUpdateInfo(
    data: ProfileUpdateInfo,
    user: AuthUser,
  ): Promise<{ error: boolean; message: string }> {
    const {
      name,
      location,
      bio,
      website,
      username: bodyUsername,
      instagram,
      twitter,
      facebook,
      tiktok,
      state,
      youtube,
      snapchat,
      telegram,
    } = data;
    console.log("ProfileUpdateInfo data:", data);
    console.log(state, website);

    const trimmedUsername = bodyUsername?.trim();
    let username;

    if (trimmedUsername) {
      username = trimmedUsername.startsWith("@")
        ? trimmedUsername
        : "@" + trimmedUsername;
    } else {
      username = user.username;
    }
    if (!user.id || isNaN(user.id))
      return { error: true, message: "Invalid user ID" };
    if (!username || username.length < 3)
      return {
        error: true,
        message: "Username must be at least 3 characters long",
      };

    // Validate social media URLs
    const socialMediaFields = {
      instagram,
      twitter,
      facebook,
      tiktok,
      youtube,
      snapchat,
      telegram,
    };
    for (const [platform, url] of Object.entries(socialMediaFields)) {
      if (url && !this.isValidUrl(url))
        return { error: true, message: `Invalid ${platform} URL` };
    }
    try {
      // Username uniqueness
      const existingUser = await query.user.findFirst({
        where: {
          username: { equals: username, mode: "insensitive" },
          NOT: { id: user.id },
        },
      });
      if (existingUser)
        return { error: true, message: "Username already exists" };

      // Selective update only if data is present (more efficient)
      const userUpdateData: any = {};
      if (name !== undefined) userUpdateData.name = name?.trim() || "";
      if (location !== undefined)
        userUpdateData.location = location?.trim() || null;
      if (bio !== undefined) userUpdateData.bio = bio?.trim() || null;
      if (username !== undefined) userUpdateData.username = username.trim();
      if (website !== undefined)
        userUpdateData.website = website?.trim() || null;
      if (state !== undefined) userUpdateData.state = state?.trim() || null;

      const settingsUpdateData: any = {};
      if (instagram !== undefined)
        settingsUpdateData.instagram_url = instagram?.trim() || null;
      if (twitter !== undefined)
        settingsUpdateData.twitter_url = twitter?.trim() || null;
      if (facebook !== undefined)
        settingsUpdateData.facebook_url = facebook?.trim() || null;
      if (tiktok !== undefined)
        settingsUpdateData.tiktok_url = tiktok?.trim() || null;
      if (youtube !== undefined)
        settingsUpdateData.youtube_url = youtube?.trim() || null;
      if (snapchat !== undefined)
        settingsUpdateData.snapchat_url = snapchat?.trim() || null;
      if (telegram !== undefined)
        settingsUpdateData.telegram_url = telegram?.trim() || null;

      const queries = [];
      if (Object.keys(userUpdateData).length > 0) {
        queries.push(
          query.user.update({ where: { id: user.id }, data: userUpdateData }),
        );
      }
      if (Object.keys(settingsUpdateData).length > 0) {
        queries.push(
          query.settings.update({
            where: { id: user.id },
            data: settingsUpdateData,
          }),
        );
      }
      if (queries.length) await query.$transaction(queries);

      return { error: false, message: "Profile updated successfully" };
    } catch (error: any) {
      console.error("ProfileUpdateInfo error:", error);
      return {
        error: true,
        message: `Error updating profile: ${error.message || "Unknown error"}`,
      };
    }
  }

  // Helper function to validate URLs
  static isValidUrl(url: string | undefined): boolean {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  static async getProfileQueryArgs({
    type,
    user,
    limit,
    cursor: pageCursor,
    searchQuery,
  }: {
    type: ProfileStatsProps["type"];
    user: AuthUser;
    limit: number;
    cursor?: string | number | null;
    searchQuery?: string;
  }) {
    let model: any,
      where: any = {},
      include: any = undefined;
    let cursor = pageCursor === 1 ? null : pageCursor;
    switch (type) {
      case "followers":
        model = query.follow;
        where.user_id = user.id;
        if (cursor) where.id = { lt: cursor };
        include = {
          followers: {
            select: {
              profile_image: true,
              profile_banner: true,
              id: true,
              username: true,
              name: true,
            },
          },
        };
        if (searchQuery) {
          where.OR = [
            {
              followers: {
                username: { contains: searchQuery, mode: "insensitive" },
              },
            },
            {
              followers: {
                name: { contains: searchQuery, mode: "insensitive" },
              },
            },
          ];
        }
        break;
      case "following":
        model = query.follow;
        where.follower_id = user.id;
        if (cursor) where.id = { lt: cursor };
        include = {
          users: {
            select: {
              profile_image: true,
              profile_banner: true,
              id: true,
              username: true,
              name: true,
            },
          },
        };
        if (searchQuery) {
          where.OR = [
            {
              users: {
                username: { contains: searchQuery, mode: "insensitive" },
              },
            },
            { users: { name: { contains: searchQuery, mode: "insensitive" } } },
          ];
        }
        break;
      case "subscribers":
        model = query.subscribers;
        where.user_id = user.id;
        if (cursor) where.id = { lt: cursor };
        include = {
          subscriber: {
            select: {
              profile_image: true,
              profile_banner: true,
              id: true,
              username: true,
              name: true,
            },
          },
        };
        if (searchQuery) {
          where.OR = [
            {
              user: {
                username: { contains: searchQuery, mode: "insensitive" },
              },
            },
            { user: { name: { contains: searchQuery, mode: "insensitive" } } },
            {
              subscriber: {
                name: { contains: searchQuery, mode: "insensitive" },
              },
            },
          ];
        }
        break;
      default:
        throw new Error("Invalid type");
    }
    return {
      model,
      queryArgs: {
        where,
        take: limit + 1,
        orderBy: { created_at: "desc" },
        ...(cursor && { skip: 1 }),
        ...(include && { include }),
      },
    };
  }

  // Profile Stats
  static async ProfileStats({
    user,
    type,
    limit = 25,
    cursor,
    query: searchQuery,
  }: ProfileStatsProps): Promise<ProfileStatsResponse> {
    const authUser = await query.user.findFirst({
      where: { id: user.id },
      select: {
        id: true,
        total_followers: true,
        total_following: true,
        total_subscribers: true,
      },
    });
    if (!authUser) {
      return {
        error: true,
        message: "Invalid user",
        data: [],
        total: 0,
        hasMore: false,
        nextCursor: 0,
      };
    }
    const count =
      type === "followers"
        ? authUser.total_followers
        : type === "following"
          ? authUser.total_following
          : authUser.total_subscribers;

    if (!user?.id) {
      return {
        error: true,
        message: "Invalid user",
        data: [],
        total: count || 0,
        hasMore: false,
        nextCursor: 0,
      };
    }

    try {
      const { model, queryArgs } = await this.getProfileQueryArgs({
        type,
        user,
        limit,
        cursor,
        searchQuery,
      });
      const data: ProfileDataItem[] = await model.findMany(queryArgs);
      if (!data || (searchQuery && data.length === 0)) {
        return {
          error: false,
          message: "No data found",
          data: [],
          total: count || 0,
          hasMore: false,
          nextCursor: 0,
        };
      }
      const hasMore = data.length > limit;
      const cursorId = hasMore ? data.pop()!.id : null;

      // Prepare user ids for fast follow check
      const otherUserIds = data.map((item) =>
        type === "followers"
          ? item.followers.id
          : type === "following"
            ? item.users.id
            : item.subscriber.id,
      );
      const followingRelations = otherUserIds.length
        ? await query.follow.findMany({
            where: { follower_id: user.id, user_id: { in: otherUserIds } },
            select: { user_id: true },
          })
        : [];

      const followingSet = new Set(followingRelations.map((f) => f.user_id));
      const enrichedData = data.map((item) => {
        const targetUser =
          type === "followers"
            ? item.followers
            : type === "following"
              ? item.users
              : item.subscriber;
        return { ...targetUser, is_following: followingSet.has(targetUser.id) };
      });

      return {
        error: false,
        message: "Data fetched successfully",
        data: enrichedData,
        hasMore,
        total: count || 0,
        nextCursor: cursorId,
      };
    } catch (error: any) {
      console.error("Error fetching profile stats:", error);
      throw new Error("Error fetching profile stats");
    }
  }

  // Follow/Unfollow User
  static async FollowUnfollowUser(
    authUser: AuthUser,
    inputAction: "follow" | "unfollow",
    userId: number,
  ): Promise<{ message: string; status: boolean }> {
    try {
      const action = inputAction.toLowerCase() as "follow" | "unfollow";
      const pastTense = action === "follow" ? "followed" : "unfollowed";
      if (authUser.id === userId) {
        return { message: `You cannot ${action} yourself`, status: false };
      }

      const user = await query.user.findFirst({ where: { id: userId } });
      if (!user) return { message: "User not found", status: false };

      if (action === "follow") {
        const existing = await query.follow.findFirst({
          where: { user_id: userId, follower_id: authUser.id },
        });
        if (existing) {
          await UserNotificationQueue.add("new-follow-notification", {
            user_id: userId,
            url: `/${authUser?.username}`,
            message: `Hi ${getSingleName(user.name)}, <strong><a href="/${authUser?.username}">${authUser?.username}</a> </strong> has just followed you`,
            action: "follow",
            notification_id: `NTF${GenerateUniqueId()}`,
            read: false,
          });
          return { message: "Already following this user", status: false };
        }
        await query.$transaction([
          query.follow.create({
            data: {
              user_id: userId,
              follow_id: `FOL${GenerateUniqueId()}`,
              follower_id: authUser.id,
            },
          }),
          query.user.update({
            where: { id: userId },
            data: { total_followers: { increment: 1 } },
          }),
          query.user.update({
            where: { id: authUser.id },
            data: { total_following: { increment: 1 } },
          }),
        ]);
        await AutomatedMessageTriggerService.sendFollowerMessage(
          userId,
          authUser.id,
        );
        await UserNotificationQueue.add("new-follow-notification", {
          user_id: userId,
          url: `/${authUser?.username}`,
          message: `Hi ${getSingleName(user.name)}, <strong><a href="/${authUser?.username}">${authUser?.username}</a> </strong> has just followed you`,
          action: "follow",
          notification_id: `NTF${GenerateUniqueId()}`,
          read: false,
        });
      } else {
        // "unfollow"
        if (
          user.admin ||
          user.role?.toLowerCase() === "admin" ||
          SPECIAL_USERNAMES.includes(user.username)
        ) {
          return {
            message: "You cannot unfollow this user",
            status: false,
          };
        }
        const unfollowResult = await query.follow.deleteMany({
          where: { user_id: userId, follower_id: authUser.id },
        });
        if (!unfollowResult.count) {
          return { message: "You are not following this user", status: false };
        }
        await query.$transaction([
          query.user.update({
            where: { id: userId },
            data: { total_followers: { decrement: 1 } },
          }),
          query.user.update({
            where: { id: authUser.id },
            data: { total_following: { decrement: 1 } },
          }),
        ]);
      }
      // Clear profile stats cache (for relevant patterns)
      try {
        const stream = redis.scanStream({
          match: `profilestats:*:${authUser.id}*`,
          count: 100,
        });
        const keysToDelete: string[] = [];
        for await (const keys of stream) keysToDelete.push(...keys);
        if (keysToDelete.length) await redis.del(...keysToDelete);
      } catch (error) {
        console.error("Error deleting cache keys:", error);
      }
      return { message: `You have ${pastTense} the user`, status: true };
    } catch (error) {
      console.error("Error following/unfollowing user:", error);
      return { message: "Error following/unfollowing user", status: false };
    }
  }

  // Tip User
  static async TipUser({
    user,
    point_buy_id,
    modelId,
  }: {
    user: AuthUser;
    point_buy_id: string;
    modelId: number;
  }): Promise<{ message: string; error: boolean }> {
    try {
      // 1. Validate input
      if (!user?.id) return { message: "User not authenticated", error: true };
      if (!point_buy_id)
        return { message: "Invalid point buy ID", error: true };

      // 2. Fetch all needed data in parallel
      const [userWallet, pointBuy, model, userPoints] = await Promise.all([
        query.userWallet.findFirst({
          where: { user_id: user.id },
          select: { id: true },
        }),
        query.globalPointsBuy.findFirst({
          where: { points_buy_id: point_buy_id },
        }),
        query.user.findFirst({
          where: { id: modelId },
          select: {
            id: true,
            username: true,
            name: true,
            user_id: true,
            UserWallet: { select: { id: true } },
          },
        }),
        query.userPoints.findFirst({
          where: { user_id: user.id },
          select: { points: true },
        }),
      ]);

      if (!pointBuy) return { message: "Point buy not found", error: true };
      if (!model) return { message: "Model not found", error: true };
      if (!userPoints || userPoints.points < pointBuy.points)
        return { message: "Insufficient points", error: true };

      // 3. Transfer points (transactional)
      await query.$transaction([
        query.userPoints.update({
          where: { user_id: user.id },
          data: { points: { decrement: pointBuy.points } },
        }),
        query.userPoints.update({
          where: { id: model.id },
          data: { points: { increment: pointBuy.points } },
        }),
      ]);

      // 4. Prepare notification and transaction data
      const pointsAmount = pointBuy.points;
      const senderTrxId = `TRX${GenerateUniqueId()}`;
      const receiverTrxId = `TRX${GenerateUniqueId()}`;

      const senderTransaction = {
        transactionId: senderTrxId,
        transaction: `You tipped ${pointsAmount} points to user ${model.username}`,
        userId: user.id,
        amount: pointsAmount,
        transactionType: "debit",
        transactionMessage: `You tipped ${pointsAmount} points to user ${model.username}`,
        walletId: userWallet?.id,
      };
      const receiverTransaction = {
        transactionId: receiverTrxId,
        transaction: `You received ${pointsAmount} points from user ${user.username}`,
        userId: model.id,
        amount: pointsAmount,
        transactionType: "credit",
        transactionMessage: `You received ${pointsAmount} points from user ${user.username}`,
        walletId: model.UserWallet?.id,
      };

      const notificationMsg = `Hi ${getSingleName(model.name)}, <strong><a href="/${user.username}">${user.username}</a></strong> has just tipped you ${pointsAmount} points`;

      // 5. Background jobs and notifications in parallel
      await Promise.all([
        UserTransactionQueue.add("userTransaction", senderTransaction, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserTransactionQueue.add("userTransaction", receiverTransaction, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserNotificationQueue.add(
          "new-tip-notification",
          {
            user_id: modelId,
            url: `/${user.username}`,
            message: notificationMsg,
            action: "purchase",
            notification_id: `NOT${GenerateUniqueId()}`,
            read: false,
          },
          { removeOnComplete: true, attempts: 3 },
        ),
        UserNotificationQueue.add(
          "new-tip-notification",
          {
            user_id: user.id,
            url: `/${model.username}`,
            message: ` You tipped ${pointsAmount} points to user ${model.username}`,
            action: "purchase",
            notification_id: `NOT${GenerateUniqueId()}`,
            read: false,
          },
          { removeOnComplete: true, attempts: 3 },
        ),
      ]);

      return {
        message: `You tipped ${pointsAmount} points to user ${model.username}`,
        error: false,
      };
    } catch (error) {
      console.error("Error tipping user:", error);
      throw new Error("Error processing tip");
    }
  }

  // Delete User Accounts and Media
  static async DeleteAccount(
    userId: number,
    password: string,
  ): Promise<{ message: string; error: boolean }> {
    try {
      if (!userId || isNaN(userId)) {
        return { message: "Invalid user ID", error: true };
      }

      // Get user to validate password
      const user = await query.user.findUnique({
        where: { id: userId },
        select: { password: true },
      });

      if (!user) {
        return { message: "User not found", error: true };
      }

      // Validate password
      const bcrypt = require("bcryptjs");
      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return {
          message: "Invalid password. Account deletion cancelled.",
          error: true,
        };
      }

      await query.user.update({
        where: { id: userId },
        data: {
          should_delete: true,
          delete_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Set delete date to 7 days from now
        },
      });

      // Clear cache
      const stream = redis.scanStream({
        match: `user_profile_${userId}*`,
        count: 100,
      });
      for await (const keys of stream) {
        if (keys.length) await redis.del(...keys);
      }

      return { message: "Account deleted successfully", error: false };
    } catch (error) {
      console.error("Error deleting account:", error);
      throw new Error("Error deleting account");
    }
  }
}

export default ProfileService;
