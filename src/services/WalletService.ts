import query from "@utils/prisma";
import type {
  AddBankProps,
  AddBankResponse,
  DeleteBankProp,
  DeleteBankResponse,
  GetBanksResponse,
  GetTransactionsResponse,
  GetWithdrawalResponse,
  OtherTransactionResponse,
  RetrieveWalletResponse,
} from "../types/wallet";
import type { AuthUser } from "../types/user";
import { PaystackService } from "./PaystackService";

export default class WalletService {
  static async RetrieveWallet(userid: number): Promise<RetrieveWalletResponse> {
    const UserWallet = await query.userWallet.findFirst({
      where: {
        user_id: userid,
      },
      select: {
        balance: true,
      },
    });

    return { wallet: UserWallet?.balance || 0, status: true };
  }

  // Add Bank
  static async AddBank(
    body: AddBankProps,
    user: AuthUser
  ): Promise<AddBankResponse> {
    const {
      accountName,
      accountNumber,
      bankCode,
      otherDetails,
      bankType,
      country,
    } = body;

    if (!accountName || !accountNumber || !bankCode) {
      return {
        error: true,
        status: false,
        message: "Account Name, Account Number and Bank Code are required",
      };
    }

    // Not using a transaction here, just a simple check and create
    try {
      const createTransferRecipient = await PaystackService.TransferRecipient({
        account_number: accountNumber,
        bank_code: bankCode,
        name: accountName,
        type: bankType,
        currency: "NGN",
      });

      // Check if bank already exists for this user and account number
      const checkBanks = await query.userBanks.findFirst({
        where: {
          user_id: user.id,
          account_number: accountNumber,
          bank_id: bankCode,
        },
      });

      if (checkBanks) {
        return {
          error: true,
          status: false,
          message: "Bank account already exists",
        };
      }

      if (!createTransferRecipient) {
        return {
          error: true,
          status: false,
          message: createTransferRecipient.message,
        };
      }

      const bank = await query.userBanks.create({
        data: {
          user_id: user.id,
          bank_id: bankCode,
          bank_type: bankType,
          bank_name: otherDetails.name,
          account_name: accountName,
          account_number: accountNumber,
          bank_country: country,
          recipient_code: createTransferRecipient.data.recipient_code,
        },
      });

      return {
        error: false,
        status: true,
        message: "Bank added successfully",
        data: {
          ...bank,
          account_number:
            "*".repeat(bank.account_number.length - 4) +
            bank.account_number.slice(-4),
        },
      };
    } catch (error: any) {
      console.log(error);
      throw new Error(error.message);
    }
  }

  // Get My Banks
  static async GetBanks(user: AuthUser): Promise<GetBanksResponse> {
    try {
      const banks = await query.userBanks.findMany({
        where: {
          user_id: user.id,
        },
      });
      return {
        error: false,
        status: true,
        message: "Bank Account Retrieved successfully",
        data: banks.map((bank) => {
          return {
            ...bank,
            account_number:
              "*".repeat(bank.account_number.length - 4) +
              bank.account_number.slice(-4),
          };
        }),
      };
    } catch (error: any) {
      return {
        status: false,
        message: error.message,
        data: [],
      };
    }
  }

  // Delete Bank
  static async DeleteBank(
    body: DeleteBankProp,
    user: AuthUser
  ): Promise<DeleteBankResponse> {
    const { accountId } = body;
    console.log(body)
    try {
      const bank = await query.userBanks.delete({
        where: {
          id: Number(accountId),
          user_id: user.id,
        },
      });
      return {
        status: true,
        error: false,
        message: "Bank deleted successfully",
        data: bank,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }

  //     GetTransactions
  static async GetTransactions(
    user: AuthUser
  ): Promise<GetTransactionsResponse> {
    try {
      const transactions = await query.userPointsPurchase.findMany({
        where: {
          user_id: user.id,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return {
        status: "success",
        error: false,
        message: `Point Purchase Transactions Retrieved`,
        data: transactions,
      };
    } catch (error: any) {
      return {
        status: "error",
        error: true,
        data: [],
        message: error.message,
      };
    }
  }

  //Other Transaction
  static async OtherTransactions(
    user: AuthUser
  ): Promise<OtherTransactionResponse> {
    try {
      const transactions = await query.userTransaction.findMany({
        where: {
          user_id: user.id,
        },
        orderBy: {
          created_at: "desc",
        },
      });

      return {
        message: `Transactions Retrieved`,
        status: "success",
        data: transactions,
        error: false,
      };
    } catch (error: any) {
      return {
        error: true,
        data: [],
        status: "error",
        message: error.message,
      };
    }
  }

  // History
  static async GetHistory(
    user: AuthUser,
    cursor?: string | null
  ): Promise<GetWithdrawalResponse> {
    try {

      console.log("Fetching withdrawal history for user:", user.id, "with cursor:", cursor);

      if (!user.id) {
        return {
          status: "error",
          error: true,
          message: "User not found",
          data: [],
        };
      }

      const history = await query.withdrawalRequest.findMany({
        where: {
          user_id: user.id,
          ...(cursor ? { id: { lt: parseInt(cursor) } } : {}),
        },
        orderBy: {
          created_at: "desc",
        },
        take: 10,
        include: {
          bank: {
            select: {
              account_name: true,
              account_number: true,
              bank_name: true,
            },
          },
        }
      });

      const nextCursor = history.length === 10 ? history[history.length - 1].id : null;

      return {
        status: "success",
        error: false,
        message: `Withdrawal History Retrieved`,
        data: history,
        nextCursor: nextCursor,
      };
    } catch (error: any) {
      throw new Error(error.message);
    }
  }
}
