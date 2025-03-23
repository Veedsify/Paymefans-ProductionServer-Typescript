import { ModelSubscriptionTier } from "@prisma/client";
import { AuthUser } from "./user";

export type CheckSubscriberResponse = {
      status: boolean;
      error: boolean;
      isSubscriber?: boolean;
      message?: string;
}

interface SunbscriberData {
      id: number;
      username: string;
      name: string;
      user_id: string;
      profile_image?: string;
      Model: {
            gender: string;
      };
      Settings: {
            subscription_price: number;
            subscription_duration: string;
      };
      ModelSubscriptionPack: {
            ModelSubscriptionTier: ModelSubscriptionTier
      }
}

export interface CreateNewSubscriptionProps {
      profileid: string;
      tier_id: string;
      user: AuthUser
}

export type GetSubscriptionDataResponse = {
      status: boolean;
      error: boolean;
      message?: string;
      data: SubscriberData
}
export type CreateNewSubscriptionResponse = {
      status: boolean;
      error: boolean;
      message?: string;
}
export type CheckSubscriberProps = {
      main_user_id: number;
      user_id: number;
}
