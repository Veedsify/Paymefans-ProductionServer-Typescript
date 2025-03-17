import PointService from "@services/PointService";
import { Request, Response } from "express";

export default class PointController {
      static async GetUserPoints(req: Request, res: Response): Promise<any> {
            try {
                  const Points = await PointService.RetrievePoints(req.body.user_id)
                  return res.status(200).json({ ...Points })
            } catch (error: any) {
                  return res.status(500).json({ error: error.message })
            }
      }
}
