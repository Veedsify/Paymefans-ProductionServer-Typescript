import type { LoginUserProps, LoginUserResponse } from "../types/auth";
import ComparePasswordHash from "@libs/ComparePassordHash";
import { Authenticate } from "@libs/jwt";
import query from "@utils/prisma";
import LoginHistoryService from "@services/LoginHistory";
import { random } from "lodash";
import EmailService from "./EmailService";
import UserService from "./UserService";
import FormatName from "@utils/FormatName";

export default class LoginService {
    // Login User
    static async LoginUser(data: LoginUserProps): Promise<LoginUserResponse> {
        try {
            if (!data) return { error: true, message: "Invalid request" };
            const { email, password: pass } = data;
            if (!email || !pass) {
                return {
                    error: true,
                    message: "Email and password are required",
                };
            }

            const user = await UserService.GetUserJwtPayload(email);

            if (!user) {
                return { error: true, message: "Invalid email or password" };
            }

            if (user && !user?.active_status) {
                return {
                    error: true,
                    message:
                        "Sorry, your account has been deactivated, contact support.",
                };
            }

            if (user.should_delete) {
                return {
                    error: true,
                    token: null,
                    tfa: true,
                    message:
                        "Your account is scheduled for deletion. Please contact support.",
                };
            }

            const match = await ComparePasswordHash(pass, user.password);

            if (!match) {
                return { error: true, message: "Invalid email or password" };
            }

            const { password, ...rest } = user;

            // Check if email is verified
            if (!user.is_email_verified) {
                const code = random(100000, 999999);
                await query.twoFactorAuth.create({
                    data: {
                        user_id: user.id,
                        code: code,
                    },
                });

                const sendVerificationEmail =
                    await EmailService.SendTwoFactorAuthEmail({
                        email: user.email,
                        code: code,
                        subject: "Verify Your Email Address",
                        name: FormatName(user.name.split(" ")[0] ?? user.name),
                    });

                if (sendVerificationEmail.error) {
                    return {
                        error: true,
                        message: sendVerificationEmail.message,
                    };
                }

                return {
                    error: false,
                    token: null,
                    requiresEmailVerification: true,
                    message:
                        "Please verify your email address. A verification code has been sent to your email.",
                    user: rest,
                };
            }

            // Determine if TFA is needed:
            // 1. If user has TFA enabled in settings → always require TFA
            // 2. If browser is NOT trusted (new browser) → require TFA
            // 3. If browser IS trusted → skip TFA
            const userHasTFAEnabled = user?.Settings?.two_factor_auth === true;

            const shouldRequireTFA = userHasTFAEnabled;

            if (shouldRequireTFA) {
                const code = random(100000, 999999);
                await query.twoFactorAuth.create({
                    data: {
                        user_id: user.id,
                        code: code,
                    },
                });

                const emailSubject = user?.Settings?.two_factor_auth
                    ? "Two Factor Authentication"
                    : "New Device Login Verification";

                const sendAuthEmail = await EmailService.SendTwoFactorAuthEmail(
                    {
                        email: user.email,
                        code: code,
                        subject: emailSubject,
                        name: FormatName(user.name.split(" ")[0] ?? user.name),
                    },
                );

                if (sendAuthEmail.error) {
                    return { error: true, message: sendAuthEmail.message };
                }

                const message = user?.Settings?.two_factor_auth
                    ? "Two factor authentication code sent to your email"
                    : "New device detected. A verification code has been sent to your email";

                return {
                    error: false,
                    token: null,
                    tfa: true,
                    message: message,
                    user: rest,
                };
            }

            const { accessToken, refreshToken } = await Authenticate(rest);
            // Save Login History
            try {
                const ip = data.ip || "0.0.0.0";
                await LoginHistoryService.SaveLoginHistory(user.id, ip);
            } catch (error) {
                console.error("Error saving login history:", error);
            }

            return {
                token: accessToken,
                refresh: refreshToken,
                error: false,
                message: "Login Successful",
                user: rest,
            };
        } catch (error) {
            return { error: true, message: "Internal server error" };
        }
    }
}
