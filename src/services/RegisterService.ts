import type { RegisteredUser } from "../types/user";
import query from "@utils/prisma";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { CreateHashedPassword } from "@libs/HashPassword";
import type { CheckForAdminResponse } from "../types/admin";
import EmailService from "./EmailService";
import type { EmailServiceProp } from "../types/email";
import type {
  RegisterServiceProp,
  RegisterServiceResponse,
} from "../types/auth";
import { scheduleWelcomeMessage } from "../jobs/WelcomeMessageJob";
import { countries } from "@libs/countries";
import LoginService from "./LoginService";
import { RBAC } from "@utils/FlagsConfig";
import { customAlphabet } from "nanoid";

export default class RegisterService {
  // Register New User
  static async isValidUsername(username: string): Promise<boolean> {
    const regex = /^[a-zA-Z0-9_]{1,20}$/;
    return regex.test(username);
  }
  static async RegisterNewUser(
    data: RegisterServiceProp,
  ): Promise<RegisterServiceResponse> {
    if (!data) return { message: "Invalid request", error: true };
    const RequiredFields = [
      "name",
      "username",
      "email",
      "phone",
      "password",
      "location",
    ];
    const MissingFields = Object.entries(data)
      .filter(([key, value]) => {
        if (RequiredFields.includes(key) && !value) {
          return key;
        }
        return null;
      })
      .map(([key]) => key)
      .join(", ");

    if (MissingFields) {
      return {
        message: `Sorry, ${MissingFields} field is missing`,
        error: true,
      };
    }

    if (data.username.length < 5) {
      return {
        message: "Username must be at least 5 characters long",
        error: true,
      };
    }

    if (data.username.length > 20) {
      return {
        message: "Username must not be more than 20 characters long",
        error: true,
      };
    }

    if (!(await this.isValidUsername(data.username))) {
      return {
        message: "Username can only contain letters, numbers, and underscores",
        error: true,
      };
    }

    const { checkPhone, checkEmail } = await this.CheckPhoneAndEmail(
      data.phone,
      data.email,
    );
    if (checkPhone) {
      return {
        message:
          "Sorry This Account Already Exists, Check Your Phone Number or Email",
        error: true,
      };
    }

    if (checkEmail) {
      return {
        message:
          "Sorry This Email Already Exists Please Check Your Phone Number or Email",
        error: true,
      };
    }

    const user = await this.CreateUser(data);
    const welcomeAccount = await this.CheckForWelcomeAccount(user);
    if (welcomeAccount?.error) {
      return { message: welcomeAccount.message, error: true };
    }
    const admin = await this.CheckForAdmin(user);
    if (admin?.error) {
      return { message: admin.message, error: true };
    }

    const EmailData: EmailServiceProp = {
      email: data.email,
      name: data.name,
      subject: "Welcome to PayMeFans",
      message:
        "Welcome to PayMeFans, we are excited to have you here. If you have any questions or need help, feel free to reach out to us.",
    };

    const WelcomeData = [
      await this.CreateWelcomeConversationAndMessage(
        user,
        welcomeAccount.userId,
      ),
      await this.CreateWelcomeNotification(user),
      await this.CreateFollowing(user, admin.id),
      await EmailService.SendWelcomeEmail(EmailData),
    ];
    await Promise.all(WelcomeData);

    const authenticateUser = await LoginService.LoginUser({
      email: data.email,
      password: data.password,
    });

    if (authenticateUser.error) {
      return {
        message: authenticateUser.message,
        error: true,
      };
    }

    return {
      shouldRedirect: true,
      message: "Account created successfully",
      error: false,
      token: authenticateUser.token,
      tfa: authenticateUser.tfa,
      data: user,
    };
  }

  // Verify Registration
  static async ValidateRegistration({
    email,
    phone,
  }: {
    email: string;
    phone: string;
  }): Promise<{
    message: string;
    status: boolean;
  }> {
    try {
      if (!email && !phone) {
        return { message: "Invalid request", status: false };
      }

      const [checkPhone, checkEmail] = await Promise.all([
        query.user.findFirst({
          where: {
            phone: {
              contains: phone,
              mode: "insensitive",
            },
          },
        }),
        query.user.findFirst({
          where: {
            email: {
              contains: email,
              mode: "insensitive",
            },
          },
        }),
      ]);

      if (checkPhone && checkEmail) {
        return { message: "Sorry, this account already exists", status: false };
      }

      return { message: "Account verified successfully", status: true };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  // Check Email and Phone Number Exist
  static async CheckPhoneAndEmail(phone: string, email: string) {
    const [checkPhone, checkEmail] = await Promise.all([
      query.user.findUnique({ where: { phone: phone } }),
      query.user.findUnique({ where: { email: email } }),
    ]);
    return {
      checkPhone,
      checkEmail,
    };
  }

  // Create The User
  static async CreateUser(data: RegisterServiceProp): Promise<RegisteredUser> {
    let uniqueUserId: string;
    let exists = true;
    const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
    while (exists) {
      uniqueUserId = nanoid();
      const existingUser = await query.user.findUnique({
        where: { user_id: uniqueUserId },
      });
      if (!existingUser) exists = false;
    }
    const hashPass = await CreateHashedPassword(data.password);
    const walletId = `WL${GenerateUniqueId()}`;
    const subscriptionId = `SUB${GenerateUniqueId()}`;

    const userCurrency = countries.find(
      (country) => country.code === data.location,
    );
    const userCountry = userCurrency?.name || "Nigeria";

    if (!userCountry) {
      throw new Error("Invalid country");
    }
    return query.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: data.name.toLocaleLowerCase(),
          user_id: uniqueUserId,
          username: `@${data.username}`,
          email: data.email,
          phone: data.phone,
          profile_banner: `${process.env.SERVER_ORIGINAL_URL}/site/banner.png`,
          profile_image: `${process.env.SERVER_ORIGINAL_URL}/site/avatar.png`,
          location: userCountry,
          currency: "NGN",
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
              two_factor_auth: true,
              subscription_duration: "1 month",
              subscription_type: "free",
            },
          },
          ModelSubscriptionPack: {
            create: {
              subscription_id: subscriptionId,
            },
          },
          flags: RBAC.getRolePermissions("user"),
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
  static async CheckForAdmin(
    user: RegisteredUser,
  ): Promise<CheckForAdminResponse> {
    const admin = await query.user.findFirst({
      where: { username: "@paymefans", admin: true },
      select: {
        user_id: true,
        id: true,
      },
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

  static async CheckForWelcomeAccount(
    user: RegisteredUser,
  ): Promise<CheckForAdminResponse> {
    const welcome = await query.user.findFirst({
      where: { username: "@welcome" },
      select: {
        user_id: true,
        id: true,
      },
    });

    if (!welcome) {
      await query.user.delete({ where: { id: user.id } });
      return {
        message: "Sorry, an error occurred while creating your account",
        error: true,
      };
    }

    return { id: welcome.id, userId: welcome.user_id, error: false };
  }

  // Create Welcome Conversation and Message
  static async CreateWelcomeConversationAndMessage(
    data: RegisteredUser,
    welcomeAccountId: string,
  ) {
    const conversationId = `CONV${GenerateUniqueId()}`;
    await query.conversations.create({
      data: {
        conversation_id: conversationId,
        participants: {
          create: {
            user_1: data.user_id,
            user_2: welcomeAccountId,
          },
        },
      },
    });
    // Schedule welcome message from admin panel configuration
    await scheduleWelcomeMessage({
      userId: data.id,
      userEmail: data.email,
      username: data.username,
    });
  }

  // Create Welcome Notification
  static async CreateWelcomeNotification(data: RegisteredUser): Promise<true> {
    const notificationId = `NOT${GenerateUniqueId()}`;
    await query.notifications.create({
      data: {
        notification_id: notificationId,
        message: `Thanks for joining us and creating an account, <strong>${data.name}</strong>. We are thrilled to meet you!`,
        user_id: data.id,
        action: "sparkle",
        url: "/profile",
      },
    });
    return true;
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
          increment: 1,
        },
      },
    });

    await query.user.update({
      where: {
        id: data.id,
      },
      data: {
        total_following: {
          increment: 1,
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
