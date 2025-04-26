import query from "@utils/prisma";
import type {
  CheckSubscriberResponse,
  GetSubscriptionDataResponse,
  CreateNewSubscriptionResponse,
  CheckSubscriberProps,
  CreateNewSubscriptionProps,
} from "../types/subscribers";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { UserTransactionQueue } from "@jobs/notifications/UserTransactionJob";
import EmailService from "./EmailService";

export default class SubscriberService {
  static async CheckSubscriber({
    main_user_id,
    user_id,
  }: CheckSubscriberProps): Promise<CheckSubscriberResponse> {
    try {
      if (!main_user_id || !user_id) {
        return { error: false, status: false, message: "Invalid request" };
      }

      if (main_user_id === user_id) {
        return { error: false, status: true, isSubscriber: true };
      }

      const subscriberData = await query.user.findFirst({
        where: {
          id: main_user_id,
          Subscribers: {
            some: {
              subscriber_id: user_id,
            },
          },
        },
      });

      if (!subscriberData) {
        return { error: false, status: true, isSubscriber: false };
      }

      return { error: false, status: true, isSubscriber: true };
    } catch (error) {
      console.log(error);
      return { error: true, status: false, message: "An error occured" };
    }
  }

  static async GetSubscriptionData(
    user_id: string
  ): Promise<GetSubscriptionDataResponse> {
    try {
      const subscriberData = await query.user.findFirst({
        where: {
          user_id: user_id,
        },
        select: {
          id: true,
          username: true,
          name: true,
          user_id: true,
          profile_image: true,
          Model: {
            select: {
              gender: true,
            },
          },
          Settings: {
            select: {
              subscription_price: true,
              subscription_duration: true,
            },
          },
          ModelSubscriptionPack: {
            select: {
              ModelSubscriptionTier: true,
            },
          },
        },
      });

      if (!subscriberData) {
        return {
          error: false,
          status: false,
          message: "User not found",
          data: {},
        };
      }

      return {
        error: false,
        status: true,
        data: subscriberData,
      };
    } catch (error) {
      console.log(error);
      throw new Error("An error occured");
    }
  }

  static async CreateNewSubscription({
    profileId,
    tier_id,
    user: authUser,
  }: CreateNewSubscriptionProps): Promise<CreateNewSubscriptionResponse> {
    try {
      // Step 1: Fetch data (no transaction needed for reads)
      const userdata = await query.user.findFirst({
        where: { id: authUser.id },
        select: {
          id: true,
          user_id: true,
          UserPoints: {
            select: {
              points: true,
            },
          },
        },
      });

      const profileData = await query.user.findFirst({
        where: {
          user_id: profileId,
        },
        select: {
          id: true,
          user_id: true,
          fullname: true,
          username: true,
          email: true,
          ModelSubscriptionPack: {
            select: {
              ModelSubscriptionTier: {
                where: {
                  id: Number(tier_id),
                },
                select: {
                  tier_name: true,
                  tier_duration: true,
                  tier_price: true,
                },
              },
            },
          },
          Settings: {
            select: {
              subscription_price: true,
              subscription_duration: true,
            },
          },
        },
      });

      if (!profileData || !userdata) {
        return { status: false, message: "User not found", error: true };
      }

      // Step 2: Check subscription (separate read operation)
      const checkSubscription = await query.subscribers.findFirst({
        where: {
          user_id: profileData.id,
          subscriber_id: userdata.id,
        },
      });

      if (checkSubscription) {
        return {
          status: false,
          message: "You are already subscribed to this user",
          error: false,
        };
      }

      // Get tier price for subscription
      const tierPrice =
        profileData.ModelSubscriptionPack?.ModelSubscriptionTier[0]
          ?.tier_price ?? 0;
      if (userdata && tierPrice > userdata?.UserPoints?.points!) {
        return {
          status: false,
          message: "You don't have enough points to subscribe to this user",
          error: false,
        };
      }

      const SUB_ID = `SUB${GenerateUniqueId()}`;
      // Step 3: Transaction for creating subscription and updating points
      // This keeps only the write operations that need to be atomic in one transaction
      const pointBalanceUpdate = await query.$transaction(async (prisma) => {
        // Create subscription
        const createSubscription = await prisma.subscribers.create({
          data: {
            user_id: profileData.id,
            subscriber_id: userdata.id,
            sub_id: SUB_ID,
          },
        });

        if (!createSubscription) {
          throw new Error("Failed to create subscription");
        }

        // Update User Point Balance
        await prisma.user.update({
          where: { id: userdata.id },
          data: {
            UserPoints: {
              update: {
                points: {
                  decrement: tierPrice,
                },
              },
            },
          },
        });

        // Update Model Point Balance
        await prisma.user.update({
          where: { id: profileData.id },
          data: {
            UserPoints: {
              update: {
                points: {
                  increment: tierPrice,
                },
              },
            },
          },
        });

        return true;
      });

      if (!pointBalanceUpdate) {
        throw new Error("Failed to update point balance");
      }

      const TRANSACTION_ID = `TRN${GenerateUniqueId()}`;
      const TRANSACTION_ID2 = `TRN${GenerateUniqueId()}`;

      const receiverOptions = {
        transactionId: TRANSACTION_ID,
        transaction: `You have received a new subscription from ${authUser.username}`,
        userId: profileData?.id,
        amount: tierPrice,
        transactionType: "credit",
        transactionMessage: `You have received a new subscription from ${authUser.username}`,
        walletId: 1,
      };

      const senderOptions = {
        transactionId: TRANSACTION_ID2,
        transaction: `You subscribed to ${profileData?.username}`,
        userId: userdata?.id,
        amount: tierPrice,
        transactionType: "debit",
        transactionMessage: `You have subscribed to ${profileData?.username}`,
        walletId: 1,
      };

      await Promise.all([
        UserTransactionQueue.add("userTransaction", senderOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
        UserTransactionQueue.add("userTransaction", receiverOptions, {
          removeOnComplete: true,
          attempts: 3,
        }),
      ]);

      //   TierDuration
      const tierDuration =
        profileData.ModelSubscriptionPack?.ModelSubscriptionTier[0]
          ?.tier_duration ?? 0;

      await Promise.all([
        EmailService.NewSubscriberNotification({
          name: profileData?.fullname ? profileData.fullname.split(" ")[0] : profileData?.fullname,
          username: authUser.username as string,
          email: profileData?.email as string,
          duration: Number(tierDuration) as number,
          date: new Date().toLocaleDateString(),
          subscriberId: userdata?.user_id as string,
        }),
      ]);

      const updateSubscription = await query.user.update({
        where: {
          id: profileData.id,
        },
        data: {
          total_subscribers: {
            increment: 1,
          },
        },
      });

      if (!updateSubscription) {
        throw new Error("Failed to update subscription count");
      }

      const existingSubscription =
        await query.userSubscriptionCurrent.findFirst({
          where: {
            user_id: authUser.id,
            model_id: profileData.id,
          },
        });

      const nextPaymentDate = new Date();
      nextPaymentDate.setDate(nextPaymentDate.getDate() + Number(tierDuration));

      //   Create Subscription History
      if (existingSubscription) {
        await query.userSubscriptionCurrent.update({
          where: {
            id: existingSubscription.id,
          },
          data: {
            subscription_id: SUB_ID,
            ends_at: nextPaymentDate,
            subscription: profileData.ModelSubscriptionPack
              ?.ModelSubscriptionTier[0]?.tier_name as string,
          },
        });
      } else {
        await query.userSubscriptionCurrent.create({
          data: {
            subscription_id: SUB_ID,
            user_id: authUser.id,
            ends_at: nextPaymentDate,
            model_id: profileData.id,
            subscription: profileData.ModelSubscriptionPack
              ?.ModelSubscriptionTier[0]?.tier_name as string,
          },
        });
      }

      await query.userSubscriptionHistory.create({
        data: {
          subscription_id: SUB_ID,
          user_id: authUser.id,
          model_id: profileData.id,
          subscription: profileData.ModelSubscriptionPack
            ?.ModelSubscriptionTier[0]?.tier_name as string,
        },
      });

      return { status: true, message: "Subscription successful", error: false };
    } catch (error) {
      console.log(error);
      throw new Error("An error occurred");
    }
  }
}
