import { Authenticate } from "@libs/jwt";
import type {
  AuthUser,
  RetrieveUserResponse,
  UpdateTwoFactorAuthResponse,
  UserJwtPayloadResponse,
  VerificationControllerResponse,
} from "../types/user";
import query from "@utils/prisma";

import LoginHistoryService from "./LoginHistory";

export default class UserService {
  static async GetUserJwtPayload(
    email: string,
  ): Promise<UserJwtPayloadResponse | null> {
    try {
      const user = await query.user.findFirst({
        where: {
          email: email,
        },
        select: {
          id: true,
          active_status: true,
          email: true,
          username: true,
          user_id: true,
          name: true,
          role: true,
          flags: true,
          should_delete: true,
          password: true,
          Settings: {
            select: {
              two_factor_auth: true,
            },
          },
        },
      });

      if (!user) {
        return null;
      }

      return user;
    } catch (error) {
      console.log(error);
      return null;
    }
  }
  static async RetrieveUser(userid: number): Promise<RetrieveUserResponse> {
    try {
      // Fetch user with related data
      const user = await query.user.findUnique({
        where: {
          id: userid,
        },
        select: {
          id: true,
          user_id: true,
          name: true,
          email: true,
          username: true,
          is_model: true,
          bio: true,
          is_active: true,
          is_verified: true,
          profile_banner: true,
          profile_image: true,
          location: true,
          website: true,
          country: true,
          state: true,
          currency: true,
          active_status: true,
          watermarkEnabled: true,
          total_followers: true,
          total_following: true,
          total_subscribers: true,
          show_active: true,
          UserPoints: {
            select: {
              id: true,
              user_id: true,
              points: true,
            },
          },
          UserWallet: {
            select: {
              id: true,
              user_id: true,
              balance: true,
            },
          },
          Settings: true,
          Model: {
            select: {
              id: true,
              firstname: true,
              lastname: true,
              user_id: true,
              gender: true,
              country: true,
              hookup: true,
              verification_status: true,
              verification_state: true,
              watermark: true,
            },
          },
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

      // const subscriptions = getMySubscriptions.map((sub) => sub.user_id);
      const { password, ...rest } = user;
      const result = {
        message: "User retrieved successfully",
        user: { ...rest, following },
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
    twofactorauth: boolean,
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
    code: number,
  ): Promise<VerificationControllerResponse> {
    try {
      const verify = await query.twoFactorAuth.findFirst({
        where: {
          code: code,
        },
        include: {
          user: {
            select: {
              username: true,
            },
          },
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

      // Save Login History
      try {
        const ip = "192.168.0.1";
        await LoginHistoryService.SaveLoginHistory(verify.user_id, ip);
      } catch (error) {
        console.error("Error saving login history:", error);
      }

      return {
        token: token.accessToken,
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
