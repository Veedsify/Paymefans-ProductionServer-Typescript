import query from "@utils/prisma";
import { RetrieveWalletResponse } from "../types/wallet";

export default class WalletService {
      static async RetrieveWallet(userid: number): Promise<RetrieveWalletResponse> {
            const UserWallet = await query.userWallet.findFirst({
                  where: {
                        user_id: userid
                  },
                  select: {
                        balance: true,
                  },
            });

            return { wallet: UserWallet?.balance || 0, status: true }
      }
}
