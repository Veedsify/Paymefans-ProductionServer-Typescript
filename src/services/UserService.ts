import { Authenticate } from "@libs/jwt";
import type {
  AuthUser,
  RetrieveUserResponse,
  UpdateTwoFactorAuthResponse,
  VerificationControllerResponse,
} from "../types/user";
import query from "@utils/prisma";
import TriggerModels from "@jobs/models";
import TriggerHookups from "@jobs/hookup";
import LoginHistoryService from "./LoginHistory";

export default class UserService {
  static async RetrieveUser(userid: number): Promise<RetrieveUserResponse> {
    try {
      // Fetch user with related data
      const user = await query.user.findUnique({
        where: {
          id: userid,
        },
        include: {
          UserPoints: true,
          UserWallet: true,
          Settings: true,
          Model: true,
        },
      });

      if (!user) {
        return { message: "User not found", status: false };
      }

      // Fetch following count
      const following = await query.user.count({
        where: {
          Follow: {
            some: {
              follower_id: userid,
            },
          },
        },
      });

      // Fetch subscriptions
      // const getMySubscriptions = await query.subscribers.findMany({
      //   where: {
      //     subscriber_id: userid,
      //   },
      //   select: {
      //     user_id: true,
      //   },
      // });

      // const subscriptions = getMySubscriptions.map((sub) => sub.user_id);
      const { password, ...rest } = user;
      const purchasedPosts: number[] = [2];

      const result = {
        message: "User retrieved successfully",
        user: { ...rest, following, purchasedPosts },
        status: true,
      };

      return result;
    } catch (error) {
      console.log(error);
      return { message: "Internal server error", status: false };
    }
  }

  // Update User Two Factor Authentication
  static async UpdateTwoFactorAuth(
    userId: number,
    twofactorauth: boolean
  ): Promise<UpdateTwoFactorAuthResponse> {
    try {
      const user = await query.user.update({
        where: {
          id: userId,
        },
        data: {
          Settings: {
            update: {
              two_factor_auth: twofactorauth,
            },
          },
        },
      });

      if (!user) {
        return { success: false, message: "User not found", error: true };
      }

      return {
        success: true,
        message: "Two factor authentication updated",
        error: false,
      };
    } catch (error) {
      console.log(error);
      return { success: false, message: "Internal server error", error: true };
    }
  }

  // Verify Two Factor Authentication
  static async VerifyTwoFactorAuth(
    code: number
  ): Promise<VerificationControllerResponse> {
    try {
      const verify = await query.twoFactorAuth.findFirst({
        where: {
          code: code,
        },
      });

      if (!verify) {
        return { success: false, message: "Invalid code", error: true };
      }

      await query.twoFactorAuth.delete({
        where: {
          id: verify.id,
        },
        select: {
          user_id: true,
        },
      });

      const user = await query.user.findUnique({
        where: {
          id: verify.user_id,
        },
        omit: {
          password: true,
        },
      });

      const token = await Authenticate(user as AuthUser);
      await TriggerModels();
      await TriggerHookups(verify.user_id);

      // Save Login History
      try {
        const ip = "192.168.0.1";
        await LoginHistoryService.SaveLoginHistory(verify.user_id, ip);
      } catch (error) {
        console.error("Error saving login history:", error);
      }

      return {
        token,
        error: false,
        message: "Login Successful",
        success: true,
        user: user as AuthUser,
      };
    } catch (error) {
      console.log(error);
      return { success: false, message: "Internal server error", error: true };
    }
  }
}
