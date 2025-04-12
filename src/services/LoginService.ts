import TriggerModels from "@jobs/models";
import type { LoginUserProps, LoginUserResponse } from "../types/auth";
import ComparePasswordHash from "@libs/ComparePassordHash";
import { Authenticate } from "@libs/jwt";
import query from "@utils/prisma";
import TriggerHookups from "@jobs/hookup";
import LoginHistoryService from "@services/LoginHistory";
import _ from "lodash";
import EmailService from "./EmailService";

export default class LoginService {
  // Login User
  static async LoginUser(data: LoginUserProps): Promise<LoginUserResponse> {
    try {
      if (!data) return { error: true, message: "Invalid request" };
      const { email, password: pass } = data;
      if (!email || !pass) {
        return { error: true, message: "Email and password are required" };
      }
      const user = await query.user.findFirst({
        where: {
          email: email,
        },
        include: {
          Settings: true,
        },
      });
      if (!user) {
        return { error: true, message: "Invalid email or password" };
      }
      const match = await ComparePasswordHash(pass, user.password);
      if (!match) {
        return { error: true, message: "Invalid email or password" };
      }
      const { password, ...rest } = user;

      if (user?.Settings?.two_factor_auth) {
        const code = _.random(100000, 999999);
        await query.twoFactorAuth.create({
          data: {
            user_id: user.id,
            code: code,
          },
        });
        const sendAuthEmail = await EmailService.SendTwoFactorAuthEmail({
          email: user.email,
          code: code,
          subject: "Two Factor Authentication",
          name: user.name.split(" ")[0] ?? user.name,
        });

        if (sendAuthEmail.error) {
          return { error: true, message: sendAuthEmail.message };
        }

        return {
          error: false,
          token: null,
          tfa: true,
          message: "Two factor authentication code sent to your email",
          user: rest,
        };
      } else {
        const token = await Authenticate(rest);
        await TriggerModels(user.id);
        await TriggerHookups(user.id);

        // Save Login History
        try {
          const ip = "192.168.0.1";
          await LoginHistoryService.SaveLoginHistory(user.id, ip);
        } catch (error) {
          console.error("Error saving login history:", error);
        }

        return { token, error: false, message: "Login Successful", user: rest };
      }
    } catch (error) {
      return { error: true, message: "Internal server error" };
    }
  }
}
