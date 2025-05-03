import query from "@utils/prisma";
import { PlatFormConvertionRate } from "types/rate";

export default class RateConversionService {
  // User Specific Convertion Rate
  static async GetConversionRate(
    userId: number,
    amount: number,
  ): Promise<{ currency: string; amount: number }> {
    try {
      const user = await query.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          currency: true,
        },
      });

      if (!user) {
        throw new Error("User not found");
      }

      const conversionRate = await query.platformExchangeRate.findFirst({
        where: {
          name: user.currency || "USD",
        },
        select: {
          name: true,
          buyValue: true,
          sellValue: true,
          rate: true,
        },
      });

      if (!conversionRate) {
        throw new Error("Conversion rate not found");
      }

      let convertedAmount = amount * conversionRate.buyValue * 100;

      return {
        currency: conversionRate.name || "USD",
        amount: convertedAmount,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error fetching conversion rate");
    }
  }
  // Platform Specific Conversion Rate
  static async GetPlatFormExchangeRate(): Promise<PlatFormConvertionRate> {
    try {
      const rates = await query.platformExchangeRate.findMany({
        select: {
          name: true,
          buyValue: true,
          sellValue: true,
          rate: true,
          symbol: true,
        },
      });

      if (!rates || rates.length === 0) {
        return {
          error: true,
          message: "No platform exchange rate found",
          data: [],
        };
      }

      return {
        error: false,
        message: "Platform exchange rate fetched successfully",
        data: rates,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error fetching platform exchange rate");
    }
  }
}
