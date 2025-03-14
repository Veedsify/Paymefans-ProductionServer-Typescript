import query from "../utils/prisma";
import { RetrievePointResponse } from "../types/points";

export default class PointService {
      static async RetrievePoints(userid: number): Promise<RetrievePointResponse> {
            const UserPoints = await query.userPoints.findFirst({
                  where: {
                        user_id: userid
                  },
                  select: {
                        points: true,
                  },
            });

            return { points: UserPoints?.points || 0, status: true }
      }
}
