import { ModelSubscriptionTier } from "@prisma/client"
import { AuthUser } from "./user"

export type CreateSubscriptionTierProps = {
      tiers: Tiers
      user: AuthUser
}

export type CreateSubscriptionTierResponse = {
      error: boolean;
      message: string;
}
export type Tiers = {
      tier_name: string
      tier_price: string
      tier_description: string
      tier_duration: string
}[]
export type CreatePack = {
      id: number
}
export type UserSubscriptionsResponse = {
      error: boolean;
      message?: string;
      data: {
            tier_name: string;
            tier_price: number;
            tier_duration: string;
            tier_description?: string;
            subscription_id: number;
      }[]
}
