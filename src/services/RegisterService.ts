import { RegisteredUser } from "../types/user";
import query from "@utils/prisma";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { CreateHashedPassword } from "@libs/HashPassword";
import { CheckForAdminResponse } from "../types/admin";
import EmailService from "./EmailService";
import { EmailServiceProp } from "../types/email";
import { RegisterServiceProp, RegisterServiceResponse } from "../types/auth";

export default class RegisterService {
    static async RegisterNewUser(data: RegisterServiceProp): Promise<RegisterServiceResponse> {
        if (!data) return { message: "Invalid request", error: true };
        const RequiredFields = [
            "name",
            "username",
            "email",
            "phone",
            "password",
            "location",
        ];
        const MissingFields = Object.entries(data).filter(([key, value]) => {
            if (RequiredFields.includes(key) && !value) {
                return key;
            }
            return null
        }).map(([key]) => key).join(", ");

        if (MissingFields) {
            return { message: `Sorry, ${MissingFields} field is missing`, error: true };
        }

        const { checkPhone, checkEmail } = await this.CheckPhoneAndEmail(data.phone, data.email);
        if (checkPhone && checkEmail) {
            return { message: "Sorry This Account Already Exists", error: true };
        }

        if (checkEmail) {
            return { message: "Sorry This Email Already Exists", error: true };
        }

        const user = await this.CreateUser(data);
        const admin = await this.CheckForAdmin(user)
        if (admin?.error) {
            return { message: admin.message, error: true };
        }

        const EmailData: EmailServiceProp = {
            email: data.email,
            subject: "Welcome to PayMeFans",
            message: "Welcome to PayMeFans, we are excited to have you here. If you have any questions or need help, feel free to reach out to us.",
        }

        const WelcomeData = [
            this.CreateWelcomeConversationAndMessage(user, admin.userId),
            this.CreateWelcomeNotification(user),
            this.CreateFollowing(user, admin.id),
            EmailService.SendWelcomeEmail(EmailData)
        ];
        await Promise.all(WelcomeData);
        return { message: "Account created successfully", error: false, data: user };
    }

    // Check Email and Phone Number Exist
    static async CheckPhoneAndEmail(phone: string, email: string) {
        const [checkPhone, checkEmail] = await Promise.all([
            query.user.findUnique({ where: { phone: phone } }),
            query.user.findUnique({ where: { email: email } }),
        ]);
        return {
            checkPhone, checkEmail
        }
    }

    // Create The User
    static async CreateUser(data: RegisterServiceProp): Promise<RegisteredUser> {
        const uniqueUserId = GenerateUniqueId();
        const hashPass = await CreateHashedPassword(data.password);
        const walletId = `WL${GenerateUniqueId()}`;
        const subscriptionId = `SUB${GenerateUniqueId()}`;

        return await query.$transaction(async (tx) => {
            const user = await tx.user.create({
                data: {
                    fullname: data.name,
                    name: data.name,
                    user_id: uniqueUserId,
                    username: `@${data.username}`,
                    email: data.email,
                    phone: data.phone,
                    profile_banner: `${process.env.SERVER_ORIGINAL_URL}/site/banner.png`,
                    profile_image: `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
                    location: data.location,
                    password: hashPass,
                    UserWallet: {
                        create: {
                            wallet_id: walletId,
                            balance: 0,
                        },
                    },
                    UserPoints: {
                        create: {
                            points: 0,
                            conversion_rate: 0,
                        },
                    },
                    Settings: {
                        create: {
                            price_per_message: 0,
                            enable_free_message: true,
                            subscription_price: 0,
                            subscription_duration: "1 month",
                            subscription_type: "free",
                        },
                    },
                    ModelSubscriptionPack: {
                        create: {
                            subscription_id: subscriptionId,
                        },
                    },
                },
                include: {
                    UserWallet: true,
                    UserPoints: true,
                    Model: true,
                },
            });

            return user;
        });
    }

    //  Check For Admin User
    static async CheckForAdmin(user: RegisteredUser): Promise<CheckForAdminResponse> {
        const admin = await query.user.findFirst({
            where: { username: "@paymefans" },
            select: {
                user_id: true,
                id: true,
            }
        });

        if (!admin) {
            await query.user.delete({ where: { id: user.id } });
            return {
                message: "Sorry, an error occurred while creating your account",
                error: true,
            };
        }

        return { id: admin.id, userId: admin.user_id, error: false };
    }

    // Create Welcome Conversation and Message
    static async CreateWelcomeConversationAndMessage(data: RegisteredUser, adminId: string) {
        const conversationId = `CONV${GenerateUniqueId()}`;
        const messageId = `MSG${GenerateUniqueId()}`;
        await query.conversations.create({
            data: {
                conversation_id: conversationId,
                participants: {
                    create: {
                        user_1: data.user_id,
                        user_2: adminId,
                    },
                },
            },
        });
        await query.messages.create({
            data: {
                message_id: messageId,
                sender_id: adminId,
                conversationsId: conversationId,
                message: `Welcome to PayMeFans, ${data.username}! <br>We are excited to have you here.<br>If you have any questions or need help, feel free to reach out to us.`,
                seen: false,
                receiver_id: data.user_id,
                attachment: [],
            },
            select: {
                message_id: true,
            },
        });
    }

    // Create Welcome Notification
    static async CreateWelcomeNotification(data: RegisteredUser): Promise<true> {
        const notificationId = `NOT${GenerateUniqueId()}`;
        await query.notifications.create({
            data: {
                notification_id: notificationId,
                message: `Thanks for joining us and creating an account, <strong>${data.fullname}</strong>. We are thrilled to meet you!`,
                user_id: data.id,
                action: "sparkle",
                url: "/profile",
            },
        });
        return true
    }


    // Create Following
    static async CreateFollowing(data: RegisteredUser, adminId: number) {
        const followingId = `FOL${GenerateUniqueId()}`;
        await query.user.update({
            where: {
                id: adminId,
            },
            data: {
                total_followers: {
                    increment: 1
                },
            },
        });

        return query.follow.create({
            data: {
                user_id: adminId,
                follow_id: followingId,
                follower_id: data.id,
            },
        });
    }
}
