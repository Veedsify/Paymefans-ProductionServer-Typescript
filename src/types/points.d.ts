import { GlobalPointsBuy } from "@prisma/client";
import { AuthUser } from "./user";

export type RetrievePointResponse = {
      points: number;
      status: boolean;
}

export type BuyPointResponse = {
      message: string;
      status: boolean;
}

export type PaystackPointBuyResponse = {
      message: string;
      status: boolean;
}

export type PointBuy = {
      points_buy_id: string;
      amount: number;
      points: number;
}

export type ConversionRateResponse = {
      rate: number | null;
      message: string;
      error: boolean;
}

export type PointPurchaseResponse = {
      message: string;
      status: boolean;
      checkout?: {
            authorization_url: string;
            reference: string;
            access_code: string;
            amount: number;
      }
      points?: number;
      platformFee?: number;
      error?: boolean;
}

export type CreatePaystackPaymentProps = {
      amount: number;
      points: number;
      user: AuthUser;
}

export type PaystackPaymentCallbackResponse = {
      message: string;
      status: boolean;
}

export type GetGlobalPointsResponse = {
      message: string;
      allPoints: GlobalPointsBuy[];
      status: boolean;
}

export type PricePerMessageResponse = {
      message: string;
      price_per_message: number;
      status: boolean;
}
