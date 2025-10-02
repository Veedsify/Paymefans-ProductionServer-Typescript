import { redis } from "@libs/RedisStore";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { config as cfg } from "@configs/config";
import query from "@utils/prisma";
import type {
  CreatePack,
  CreateSubscriptionTierProps,
  CreateSubscriptionTierResponse,
  Tiers,
  UserSubscriptionsResponse,
} from "types/subscriptiontier";
import ConfigService from "./ConfigService";

export default class SubscriptionTierService {
  // Create Subscription Tier
  static async CreateSubscriptionTier({
    tiers,
    user,
  }: CreateSubscriptionTierProps): Promise<CreateSubscriptionTierResponse> {
    return query.$transaction(async (prisma) => {
      try {
        const subscriptionId = `SUB${GenerateUniqueId()}`;
        const key = `user:${user.user_id}:subscriptions`;
        // Check if user already has a subscription pack
        const findIfHasPack = await prisma.modelSubscriptionPack.findFirst({
          where: {
            user_id: user.id,
          },
          select: {
            id: true,
          },
        });

        const config = await ConfigService.Config();

        if (!config.data?.point_conversion_rate_ngn) {
          return {
            error: true,
            message: "Point conversion rate not set. Please contact support.",
          };
        }

        const priceIsLowerThanMinimum = tiers.some(
          (tier) =>
            parseFloat(tier.tier_price) *
              config.data!.point_conversion_rate_ngn <
            cfg.minimumSubscriptionPriceNgn,
        );

        if (priceIsLowerThanMinimum) {
          return {
            error: true,
            message:
              "Minimum subscription price is ₦" +
              cfg.minimumSubscriptionPriceNgn,
          };
        }

        // Function to create subscription tiers
        async function createSubscriptionTiers(
          tiers: Tiers,
          createPack: CreatePack,
        ) {
          await prisma.modelSubscriptionTier.createMany({
            data: tiers.map((tier) => ({
              subscription_id: createPack.id,
              tier_name: tier.tier_name,
              tier_price: parseFloat(tier.tier_price),
              tier_description: tier.tier_description,
              tier_duration: tier.tier_duration,
            })),
          });
        }

        // Cache the model subscription pack
        async function CacheModelSubscriptionPack(pack: CreatePack) {
          redis.del(key);
          const getTiers = await prisma.modelSubscriptionTier.findMany({
            where: {
              subscription_id: pack.id,
            },
            select: {
              tier_name: true,
              tier_price: true,
              tier_duration: true,
              tier_description: true,
              subscription_id: true,
            },
          });
          redis.set(key, JSON.stringify(getTiers), "EX", 600); // Cache for 10 minutes
          return getTiers;
        }

        // If the user has an existing pack, update the tiers
        if (findIfHasPack) {
          await prisma.modelSubscriptionTier.deleteMany({
            where: {
              subscription_id: findIfHasPack.id,
            },
          });

          await createSubscriptionTiers(tiers, findIfHasPack);
          await CacheModelSubscriptionPack(findIfHasPack);

          return {
            error: false,
            message: "Subscription tiers updated successfully",
          };
        } else {
          // Create a new pack and associated tiers
          const createPack = await prisma.modelSubscriptionPack.create({
            data: {
              subscription_id: subscriptionId,
              user_id: user.id,
            },
          });

          await createSubscriptionTiers(tiers, createPack);
          await CacheModelSubscriptionPack(createPack);

          return {
            error: false,
            message: "Subscription tiers created successfully",
          };
        }
      } catch (e: any) {
        console.error(e);
        throw new Error(e);
      }
    });
  }

  static async UserSubscriptions(
    user_id: string,
  ): Promise<UserSubscriptionsResponse> {
    const key = `user:${user_id}:subscriptions`;
    try {
      // Try to get subscriptions from Redis cache first
      const result = await redis.get(key);
      if (result) {
        return {
          error: false,
          data: JSON.parse(result),
          message: "Subscriptions found in cache",
        };
      }

      // Fetch subscriptions from database if not in cache
      const subscriptions = await query.user.findFirst({
        where: {
          user_id: user_id,
        },
        select: {
          ModelSubscriptionPack: {
            select: {
              ModelSubscriptionTier: {
                select: {
                  tier_name: true,
                  tier_price: true,
                  tier_duration: true,
                  tier_description: true,
                  subscription_id: true,
                },
              },
            },
          },
        },
      });

      // Check if the subscription data exists
      if (subscriptions?.ModelSubscriptionPack?.ModelSubscriptionTier) {
        // Cache the result for future use
        await redis.set(
          key,
          JSON.stringify(
            subscriptions.ModelSubscriptionPack.ModelSubscriptionTier,
          ),
          "EX",
          600,
        ); // Cache for 10 minutes

        return {
          error: false,
          data: subscriptions.ModelSubscriptionPack.ModelSubscriptionTier,
          message: "Subscriptions found in database and cached",
        };
      }
      return {
        error: false,
        data: [],
        message: "No subscriptions found",
      };
    } catch (err) {
      console.error(err);
      return {
        error: true,
        data: [],
        message: "Error retrieving subscriptions",
      };
    }
  }
}
