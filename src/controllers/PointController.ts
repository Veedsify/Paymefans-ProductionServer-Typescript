import PointService from "@services/PointService";
import type { Request, Response } from "express";

export default class PointController {
  // Get points
  static async GetUserPoints(req: Request, res: Response): Promise<any> {
    try {
      const Points = await PointService.RetrievePoints(req.body.user_id);
      return res.status(200).json({ ...Points });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  // Buy points
  static async BuyPoints(req: Request, res: Response): Promise<any> {
    try {
      const Points = await PointService.BuyPoints(
        req?.user!,
        req.body.points_buy_id,
      );
      return res.status(200).json({ ...Points });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  // Conversion rate
  static async ConversionRate(req: Request, res: Response): Promise<any> {
    try {
      const Rate = await PointService.GetConversionRate(req.body.points_buy_id);
      return res.status(200).json({ ...Rate });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  // Purchase points
  static async PurchasePoints(req: Request, res: Response): Promise<any> {
    try {
      console.log(req.body);
      const Points = await PointService.PurchasePoints(
        req?.user!,
        req.body.amount,
        parseInt(req.body.ngn_amount),
      );
      return res.status(200).json({ ...Points });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  // Payment callback
  static async PaymentCallBack(req: Request, res: Response): Promise<any> {
    try {
      const Points = await PointService.PaystackPaymentCallBack({
        reference: req.query.reference as string,
      });
      if (Points.status) {
        res.redirect(process.env.APP_URL + "/wallet/");
        return;
      }
      return res.status(200).redirect(process.env.APP_URL + "/wallet/");
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // Get global points
  static async GetGlobalPoints(_: Request, res: Response): Promise<any> {
    try {
      const Points = await PointService.GetGlobalPoints();
      return res.status(200).json({ ...Points });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
  // Price per message
  static async PricePerMessage(req: Request, res: Response): Promise<any> {
    try {
      const Points = await PointService.PricePerMessage(req.body.user_id);
      return res.status(200).json({ ...Points });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}
