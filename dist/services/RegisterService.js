"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_1 = __importDefault(require("@utils/prisma"));
const GenerateUniqueId_1 = require("@utils/GenerateUniqueId");
const HashPassword_1 = require("@libs/HashPassword");
const EmailService_1 = __importDefault(require("./EmailService"));
class RegisterService {
    static RegisterNewUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return { message: "Invalid request", error: true };
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
                return null;
            }).map(([key]) => key).join(", ");
            if (MissingFields) {
                return { message: `Sorry, ${MissingFields} field is missing`, error: true };
            }
            const { checkPhone, checkEmail } = yield this.CheckPhoneAndEmail(data.phone, data.email);
            if (checkPhone && checkEmail) {
                return { message: "Sorry This Account Already Exists", error: true };
            }
            if (checkEmail) {
                return { message: "Sorry This Email Already Exists", error: true };
            }
            const user = yield this.CreateUser(data);
            const admin = yield this.CheckForAdmin(user);
            if (admin === null || admin === void 0 ? void 0 : admin.error) {
                return { message: admin.message, error: true };
            }
            const EmailData = {
                email: data.email,
                subject: "Welcome to PayMeFans",
                message: "Welcome to PayMeFans, we are excited to have you here. If you have any questions or need help, feel free to reach out to us.",
            };
            const WelcomeData = [
                this.CreateWelcomeConversationAndMessage(user, admin.userId),
                this.CreateWelcomeNotification(user),
                this.CreateFollowing(user, admin.id),
                EmailService_1.default.SendWelcomeEmail(EmailData)
            ];
            yield Promise.all(WelcomeData);
            return { message: "Account created successfully", error: false, data: user };
        });
    }
    // Check Email and Phone Number Exist
    static CheckPhoneAndEmail(phone, email) {
        return __awaiter(this, void 0, void 0, function* () {
            const [checkPhone, checkEmail] = yield Promise.all([
                prisma_1.default.user.findUnique({ where: { phone: phone } }),
                prisma_1.default.user.findUnique({ where: { email: email } }),
            ]);
            return {
                checkPhone, checkEmail
            };
        });
    }
    // Create The User
    static CreateUser(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const uniqueUserId = (0, GenerateUniqueId_1.GenerateUniqueId)();
            const hashPass = yield (0, HashPassword_1.CreateHashedPassword)(data.password);
            const walletId = `WL${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            const subscriptionId = `SUB${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            return yield prisma_1.default.$transaction((tx) => __awaiter(this, void 0, void 0, function* () {
                const user = yield tx.user.create({
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
            }));
        });
    }
    //  Check For Admin User
    static CheckForAdmin(user) {
        return __awaiter(this, void 0, void 0, function* () {
            const admin = yield prisma_1.default.user.findFirst({
                where: { username: "@paymefans" },
                select: {
                    user_id: true,
                    id: true,
                }
            });
            if (!admin) {
                yield prisma_1.default.user.delete({ where: { id: user.id } });
                return {
                    message: "Sorry, an error occurred while creating your account",
                    error: true,
                };
            }
            return { id: admin.id, userId: admin.user_id, error: false };
        });
    }
    // Create Welcome Conversation and Message
    static CreateWelcomeConversationAndMessage(data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const conversationId = `CONV${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            const messageId = `MSG${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            yield prisma_1.default.conversations.create({
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
            yield prisma_1.default.messages.create({
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
        });
    }
    // Create Welcome Notification
    static CreateWelcomeNotification(data) {
        return __awaiter(this, void 0, void 0, function* () {
            const notificationId = `NOT${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            yield prisma_1.default.notifications.create({
                data: {
                    notification_id: notificationId,
                    message: `Thanks for joining us and creating an account, <strong>${data.fullname}</strong>. We are thrilled to meet you!`,
                    user_id: data.id,
                    action: "sparkle",
                    url: "/profile",
                },
            });
            return true;
        });
    }
    // Create Following
    static CreateFollowing(data, adminId) {
        return __awaiter(this, void 0, void 0, function* () {
            const followingId = `FOL${(0, GenerateUniqueId_1.GenerateUniqueId)()}`;
            yield prisma_1.default.user.update({
                where: {
                    id: adminId,
                },
                data: {
                    total_followers: {
                        increment: 1
                    },
                },
            });
            return prisma_1.default.follow.create({
                data: {
                    user_id: adminId,
                    follow_id: followingId,
                    follower_id: data.id,
                },
            });
        });
    }
}
exports.default = RegisterService;
