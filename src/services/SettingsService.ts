import ComparePasswordHash from "@libs/ComparePassordHash";
import query from "@utils/prisma";
import type {
  ChangePassWordProps,
  ChangePasswordResponse,
  CheckUserNameResponse,
  HookupStatusChangeResponse,
  HookUpStatusProps,
  SetMessagePriceProps,
  SetMessagePriceResponse,
  SettingProfileProps,
  SettingsProfileChangeResponse,
} from "types/settings";
import type { AuthUser } from "types/user";
import { passwordStrength } from "check-password-strength";
import { CreateHashedPassword } from "@libs/HashPassword";
import { redis } from "@libs/RedisStore";

export default class SettingsService {
  // SettingsProfileChange Function To Change Users Profile Data
  static async SettingsProfileChange(
    body: SettingProfileProps,
    userId: number,
    userName: string,
  ): Promise<SettingsProfileChangeResponse> {
    try {
      const { name, location, bio, website, email, username } = body;
      return await query.$transaction(async (tx) => {
        const checkUser = await tx.user.findUnique({
          where: {
            username: username,
          },
        });
        if (checkUser && checkUser.id !== userId) {
          return {
            error: true,
            message: "Username already exists",
          };
        }
        await tx.user.update({
          where: {
            id: userId,
          },
          data: {
            name,
            location,
            bio,
            username,
            email,
            website,
          },
        });

        await tx.oldUsername.create({
          data: {
            user_id: userId,
            old_username: userName || "",
          }
        })

        return {
          error: false,
          message: "Profile Updated Successfully",
        };
      });
    } catch (err: any) {
      console.log(err);
      throw new Error("Internal Server Error");
    }
  }

  static async HookupStatusChange(
    body: HookUpStatusProps,
    user: AuthUser,
  ): Promise<HookupStatusChangeResponse> {
    try {
      const { hookup } = body;
      const result = await query.$transaction(async (tx) => {
        const changeHookupStatus = await tx.user.update({
          where: { id: user.id },
          data: {
            Model: {
              update: {
                hookup: hookup === true ? true : false,
              },
            },
          },
        });
        if (!changeHookupStatus) {
          throw new Error("Error updating hookup status");
        }
        return {
          error: false,
          message: "Hookup status updated successfully",
        };
      });
      return result;
    } catch (err: any) {
      console.log(err);
      throw new Error("Internal Server Error");
    }
  }

  static async ChangePassword(
    body: ChangePassWordProps,
    user: AuthUser,
  ): Promise<ChangePasswordResponse> {
    try {
      const { oldPassword, newPassword } = body;

      const result = await query.$transaction(async (tx) => {
        const userPassword = await tx.user.findFirst({
          where: { user_id: user.user_id },
          select: { password: true },
        });

        if (!userPassword) {
          return {
            error: true,
            status: false,
            message: "User not found",
          };
        }

        const match = await ComparePasswordHash(
          oldPassword,
          userPassword.password,
        );
        if (!match) {
          return {
            error: true,
            status: false,
            message: "Old password is incorrect",
          };
        }

        const passwordStrengthResult = passwordStrength(newPassword).value;
        if (passwordStrengthResult === "Weak") {
          return {
            error: true,
            status: false,
            message: "Password is weak",
          };
        }

        const hashPass = await CreateHashedPassword(newPassword);
        await tx.user.update({
          where: { user_id: user.user_id },
          data: { password: hashPass },
        });

        return {
          error: false,
          message: "Password changed successfully",
          status: true,
        };
      });
      return result;
    } catch (error: any) {
      console.error(error);
      throw new Error(error.message);
    }
  }

  static async SetMessagePrice(
    body: SetMessagePriceProps,
    user: AuthUser,
  ): Promise<SetMessagePriceResponse> {
    const { price_per_message, enable_free_message, subscription_price } = body;

    try {
      const result = await query.$transaction(async (tx) => {
        await tx.settings.update({
          where: { user_id: user.id },
          data: {
            subscription_price: parseFloat(subscription_price),
            price_per_message: parseFloat(price_per_message),
            enable_free_message,
          },
        });

        // Update Redis after transaction is successful
        const PriceKey = `price_per_message:${user.user_id}`;
        await redis.set(PriceKey, price_per_message);

        return {
          message: "Message price updated successfully",
          status: true,
          error: false,
        };
      });

      return result;
    } catch (error) {
      console.error(error);
      return {
        message: "Error updating message price",
        status: false,
        error: true,
      };
    }
  }

  // Check Username Before Change
  static async CheckUserName(
    username: string,
    user: AuthUser,
  ): Promise<CheckUserNameResponse> {
    try {
      if (!username) {
        return {
          status: false,
          error: true,
          username: "",
          message: "Username is required",
        };
      }

      const checkUsername = await query.user.findFirst({
        where: {
          username: {
            equals: username,
            mode: "insensitive",
          },
        },
        select: {
          username: true,
        },
      });

      if (!checkUsername) {
        return {
          status: true,
          error: false,
          username: username,
          message: "Username is available",
        };
      }

      if (checkUsername.username === user?.username) {
        return {
          status: true,
          error: false,
          username: username,
          message: "Username is available",
        };
      }

      return {
        status: false,
        error: true,
        username: "",
        message: "Username already exists",
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  // Update Show Active Status
  static async UpdateShowActiveStatus(
    show_active: boolean,
    user: AuthUser,
  ): Promise<{ message: string; status: boolean; error: boolean }> {
    try {
      if (typeof show_active !== "boolean") {
        return {
          status: false,
          error: true,
          message: "show_active must be a boolean value",
        };
      }

      await query.user.update({
        where: { id: user.id },
        data: { show_active },
      });

      return {
        status: true,
        error: false,
        message: `Active status visibility ${show_active ? "enabled" : "disabled"} successfully`,
      };
    } catch (error: any) {
      console.error("Error updating show_active status:", error);
      return {
        status: false,
        error: true,
        message: "Error updating active status visibility",
      };
    }
  }


  static async GetUserSettings(userId: number) {
    try {
      const settings = await query.settings.findUnique({
        where: { user_id: userId },
        select: {
          price_per_message: true,
          enable_free_message: true,
          subscription_price: true,
          watermark_uid: true,
        },
      });

      if (!settings) {
        throw new Error("Settings not found");
      }

      return {
        error: false,
        message: "Settings retrieved successfully",
        settings,
      };
    } catch (error: any) {
      console.error("Error retrieving user settings:", error);
      return {
        error: true,
        message: "Error retrieving user settings",
        settings: null,
      };
    }
  }
}
