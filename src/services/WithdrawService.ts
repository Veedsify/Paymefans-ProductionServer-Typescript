import { AuthUser } from "types/user";
import { CreateWithdrawRequestResponse } from "../types/withdraw";
import * as process from "node:process";
import query from "@utils/prisma";
import { HashPin } from "@libs/HashPin";

export default class WithdrawService {
    // Logic to create a withdraw request
    static async CreateWithdraw(data: { userId: number, amount: number }): Promise<CreateWithdrawRequestResponse> {
        try {
            // This is just a placeholder, implement your actual logic here
            const { userId, amount } = data;
            const { MINIMUM_WITHDRAWAL_AMOUNT } = process.env
            if (!userId) {
                return { error: true, message: 'Incorrect user id' };
            }

            if (!amount) {
                return { error: true, message: 'Incorrect amount' };
            }

            if (Number(amount) < Number(MINIMUM_WITHDRAWAL_AMOUNT)) {
                return {
                    error: true, message: 'Minimum withdraw amount is ' + MINIMUM_WITHDRAWAL_AMOUNT,
                };
            }


            // Simulate a successful withdraw request
            return { error: false, message: "Withdraw request created successfully" };
        } catch
        (error: any) {
            console.error(error);
            throw new Error(error.message)
        }
    }

    // Verify Withdraw Pin
    static async VerifyWithdrawPin(data: { user: AuthUser, pin: string }): Promise<CreateWithdrawRequestResponse> {
        try {
            const { user, pin } = data;
            if (!user) {
                return { error: true, message: 'Incorrect user' };
            }

            if (!pin) {
                return { error: true, message: 'Incorrect pin' };
            }

            // Simulate a successful pin verification
            const getPin = await query.userWithdrawalPin.findFirst({
                where: {
                    user_id: user.id,
                }
            })

            if (!getPin) {
                return { error: true, message: 'Pin not found' };
            }

            const hashedPin = await HashPin(pin);

            const isPinValid = await query.userWithdrawalPin.findFirst({
                where: {
                    user_id: user.id,
                    pin: hashedPin,
                }
            })

            if (!isPinValid) {
                return { error: true, message: 'Invalid pin' };
            }

            return { error: false, message: "Pin verified successfully" };

        } catch (error: any) {
            console.error(error);
            throw new Error(error.message)
        }
    }


    // Create Withdraw Pin
    static async CreateWithdrawPin(data: { user: AuthUser, pin: string }): Promise<CreateWithdrawRequestResponse> {
        try {
            const { user, pin } = data;
            if (!user) {
                return { error: true, message: 'Incorrect user' };
            }

            if (!pin) {
                return { error: true, message: 'Incorrect pin' };
            }

            const hashedPin = await HashPin(pin);

            const createPin = await query.userWithdrawalPin.create({
                data: {
                    user_id: user.id,
                    pin: hashedPin,
                }
            })

            if (!createPin) {
                return { error: true, message: 'Failed to create pin' };
            }

            await query.user.update({
                where: {
                    id: user.id,
                },
                data: {
                    hasPin: true,
                }
            })

            return { error: false, message: "Pin created successfully" };

        } catch (error: any) {
            console.error(error);
            throw new Error(error.message)
        }
    }
}