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
    SettingsProfileChangeResponse
} from "types/settings"
import type { AuthUser } from "types/user";
import { passwordStrength } from 'check-password-strength'
import { CreateHashedPassword } from "@libs/HashPassword";
import { redis } from "@libs/RedisStore";

export default class SettingsService {
    // SettingsProfileChange Function To Change Users Profile Data
    static async SettingsProfileChange(body: SettingProfileProps, userId: number): Promise<SettingsProfileChangeResponse> {
        try {
            const { name, location, bio, website, email, username } = body;
            return await query.$transaction(async (tx) => {
                const checkEmail = await tx.user.findUnique({
                    where: {
                        username: username,
                    },
                });
                if (checkEmail && checkEmail.id !== userId) {
                    return {
                        error: true,
                        message: "Email already exists",
                    };
                }
                await tx.user.update({
                    where: {
                        id: userId
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
                return {
                    error: false,
                    message: "Profile Updated Successfully"
                };
            });
        } catch (err: any) {
            console.log(err);
            throw new Error("Internal Server Error");
        }
    }

    static async HookupStatusChange(body: HookUpStatusProps, user: AuthUser): Promise<HookupStatusChangeResponse> {
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

    static async ChangePassword(body: ChangePassWordProps, user: AuthUser): Promise<ChangePasswordResponse> {
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
                    }
                }

                const match = await ComparePasswordHash(oldPassword, userPassword.password);
                if (!match) {
                    return {
                        error: true,
                        status: false,
                        message: "Old password is incorrect",
                    }
                }

                const passwordStrengthResult = passwordStrength(newPassword).value;
                if (passwordStrengthResult === "Weak") {
                    return {
                        error: true,
                        status: false,
                        message: "Password is weak",
                    }
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
            throw new Error(error.message)
        }

    }

    static async SetMessagePrice(body: SetMessagePriceProps, user: AuthUser): Promise<SetMessagePriceResponse> {
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

                return { message: "Message price updated successfully", status: true, error: false };
            });

            return result;
        } catch (error) {
            console.error(error);
            return { message: "Error updating message price", status: false, error: true };
        }
    }

    // Check Username Before Change
    static async CheckUserName(username: string, user: AuthUser): Promise<CheckUserNameResponse> {
        try {

            if (!username) {
                return {
                    status: false,
                    error: true,
                    username: "",
                    message: "Username is required"
                };
            }

            const checkUsername = await query.user.findFirst({
                where: {
                    username: {
                        equals: username,
                        mode: "insensitive",
                    }
                },
                select: {
                    username: true
                }
            });

            if (!checkUsername) {
                return {
                    status: true,
                    error: false,
                    username: username,
                    message: "Username is available"
                }
            }

            if(checkUsername.username === user?.username){
                return {
                    status: true,
                    error: false,
                    username: username,
                    message: "Username is available"
                }
            }

            return {
                status: false,
                error: true,
                username: "",
                message: "Username already exists"
            }

        } catch (error: any) {
            throw new Error(error.message)
        }
    }
}
