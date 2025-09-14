import RateConversionService from "@services/RateConversionService";
import { Request, Response } from "express";
export default class RateController {
  static async GetPlatformExchangeRate(
    _: Request,
    res: Response,
  ): Promise<any> {
    try {
      const rates = await RateConversionService.GetPlatFormExchangeRate();
      if (rates.error) {
        console.log("Error in GetPlatformExchangeRate: ", rates);
        return res.status(400).json(rates);
      }
      return res.status(200).json(rates);
    } catch (error: any) {
      console.error("Error in GetPlatformExchangeRate: ", error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}
