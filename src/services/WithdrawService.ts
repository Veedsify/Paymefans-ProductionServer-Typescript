import {CreateWithdrawRequestResponse} from "../types/withdraw";
import * as process from "node:process";

export default class WithdrawService {
    // Logic to create a withdraw request
    static async CreateWithdraw(data: { userId: number, amount: number }): Promise<CreateWithdrawRequestResponse> {
        try {
            // This is just a placeholder, implement your actual logic here
            const {userId, amount} = data;
            const {MINIMUM_WITHDRAWAL_AMOUNT} = process.env
            if (!userId) {
                return {error: true, message: 'Incorrect user id'};
            }

            if (!amount) {
                return {error: true, message: 'Incorrect amount'};
            }

            if (Number(amount) < Number(MINIMUM_WITHDRAWAL_AMOUNT)) {
                return {
                    error: true, message: 'Minimum withdraw amount is ' + MINIMUM_WITHDRAWAL_AMOUNT,
                };
            }


            // Simulate a successful withdraw request
            return {error: false, message: "Withdraw request created successfully"};
        } catch
            (error: any) {
            console.error(error);
            throw new Error(error.message)
        }
    }
}