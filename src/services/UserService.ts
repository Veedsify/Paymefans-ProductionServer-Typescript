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
    email: string
  ): Promise<UserJwtPayloadResponse | null> {
    try {
      const user = await query.user.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive",
          },
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
          admin: true,
          total_followers: true,
          total_following: true,
          total_subscribers: true,
          show_active: true,
          created_at: true,
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

      const result = {
        message: "User retrieved successfully",
        user: { ...user, following } as Partial<AuthUser>,
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

      if (!user) {
        return { success: false, message: "User not found", error: true };
      }

      const token = await Authenticate(user as any);

      // Save Login History
      try {
        const ip = "192.168.0.1";
        await LoginHistoryService.SaveLoginHistory(verify.user_id, ip);
      } catch (error) {
        console.error("Error saving login history:", error);
      }

      return {
        token: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
        },
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

  // Resend Two Factor Authentication Code
  static async ResendTwoFactorCode(
    email: string
  ): Promise<{ message: string; error: boolean; status: boolean }> {
    try {
      // Find the user with a pending 2FA code
      const pendingAuth = await query.twoFactorAuth.findFirst({
        where: {
          user: {
            email: {
              equals: email,
              mode: "insensitive",
            },
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              Settings: {
                select: {
                  two_factor_auth: true,
                },
              },
            },
          },
        },
      });

      if (!pendingAuth) {
        return {
          message: "No pending verification found. Please login again.",
          error: true,
          status: false,
        };
      }

      const user = pendingAuth.user;

      if (!user.Settings?.two_factor_auth) {
        return {
          message: "Two factor authentication is not enabled for this account",
          error: true,
          status: false,
        };
      }

      // Generate new code
      const { random } = await import("lodash");
      const code = random(100000, 999999);

      // Update existing code
      await query.twoFactorAuth.update({
        where: {
          id: pendingAuth.id,
        },
        data: {
          code: code,
        },
      });

      // Send email
      const EmailService = (await import("./EmailService")).default;
      const FormatName = (await import("@utils/FormatName")).default;

      const sendAuthEmail = await EmailService.SendTwoFactorAuthEmail({
        email: user.email,
        code: code,
        subject: "Two Factor Authentication",
        name: FormatName(user.name.split(" ")[0] ?? user.name),
      });

      if (sendAuthEmail.error) {
        return {
          message: sendAuthEmail.message,
          error: true,
          status: false,
        };
      }

      return {
        message: "Verification code resent successfully",
        error: false,
        status: true,
      };
    } catch (error) {
      console.log(error);
      return {
        message: "Internal server error",
        error: true,
        status: false,
      };
    }
  }
}
