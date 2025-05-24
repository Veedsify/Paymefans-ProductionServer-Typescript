import { AuthUser } from "types/user";
import { CreateWithdrawRequestResponse } from "../types/withdraw";
import query from "@utils/prisma";
import { HashPin } from "@libs/HashPin";
import GetSinglename from "@utils/GetSingleName";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import EmailService from "./EmailService";
import { Configurations, UserBanks } from "@prisma/client";
import ConfigService from "./ConfigService";
import bcryptjs from "bcryptjs";
export default class WithdrawService {
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
            const isPinValid = bcryptjs.compareSync(pin, getPin.pin); // Use bcryptjs to compare the pin
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
    // Confirm Withdraw
    // Optimized Confirm Withdraw
    static async ConfirmWithdraw(data: { user: AuthUser, amount: number, bankId: number, action: string, pin: string }): Promise<CreateWithdrawRequestResponse> {
        try {
            const { user, amount, bankId, action, pin } = data;
            // Get configuration and validate
            const config = await ConfigService.Config();
            if (config.error) {
                return {
                    error: true,
                    message: config.message || 'Failed to retrieve configuration',
                };
            }
            // Input validation
            const validationError = this.validateWithdrawInput({ user, amount, bankId, action, pin, config });
            if (validationError) return validationError;
            // Check user points balance
            const pointsValidation = await this.validateUserPoints(user.id, amount, config?.data?.point_conversion_rate_ngn || 100);
            if (pointsValidation.error) return {
                error: true,
                message: pointsValidation.message || 'Insufficient Balance',
            };
            // Get recipient bank account
            const recipient = await query.userBanks.findFirst({
                where: { id: bankId }
            });
            if (!recipient) {
                return {
                    error: true,
                    message: 'Bank account not found',
                };
            }
            // Handle pin verification/creation based on action
            const pinResult = await this.handlePinAction(action, user, String(pin));
            if (pinResult.error) return pinResult;
            // Process withdrawal (common logic for both actions)
            return await this.processWithdrawal(user, amount, recipient, pointsValidation?.pointToRemove!);
        } catch (error: any) {
            console.error(error);
            throw new Error(error.message);
        }
    }
    // Helper method for input validation
    private static validateWithdrawInput({ user, amount, bankId, action, pin, config }: {
        user: AuthUser, amount: number, bankId: number, action: string, pin: string, config: {
            error: boolean;
            message: string;
            data: Configurations | null;
        }
    }): CreateWithdrawRequestResponse | null {
        if (!user) {
            return { error: true, message: 'Incorrect user' };
        }
        if (!amount || !bankId || !action || !pin) {
            return { error: true, message: 'Incorrect data' };
        }
        if (action !== 'verify' && action !== 'create') {
            return { error: true, message: 'Invalid action' };
        }
        const MINIMUM_WITHDRAWAL_AMOUNT = (config?.data?.min_withdrawal_amount_ngn || 50_000)
        if (Number(amount) < Number(MINIMUM_WITHDRAWAL_AMOUNT)) {
            return {
                error: true,
                message: 'Minimum withdraw amount is ' + MINIMUM_WITHDRAWAL_AMOUNT,
            };
        }
        return null; // No validation errors
    }
    // Helper method for validating user points
    private static async validateUserPoints(userId: number, amount: number, conversionRate: number): Promise<{ error: boolean; message?: string; pointToRemove?: number }> {
        const pointBalance = await query.userPoints.findFirst({
            where: { user_id: userId }
        });
        const pointToRemove = Math.ceil(Number(amount) / conversionRate);
        if (!pointBalance || pointBalance.points < pointToRemove) {
            return {
                error: true,
                message: `Insufficient points. You need at least ${pointToRemove} points to withdraw ${amount} NGN.`,
            };
        }
        return { error: false, pointToRemove };
    }
    // Helper method for handling pin actions
    private static async handlePinAction(action: string, user: AuthUser, pin: string): Promise<CreateWithdrawRequestResponse> {
        if (action === 'verify') {
            const verifyPin = await WithdrawService.VerifyWithdrawPin({ user, pin });
            if (verifyPin.error) {
                return {
                    error: true,
                    message: verifyPin.message || 'Failed to verify pin',
                };
            }
        } else if (action === 'create') {
            const createPin = await WithdrawService.CreateWithdrawPin({ user, pin });
            if (createPin.error) {
                return {
                    error: true,
                    message: createPin.message || 'Failed to create pin',
                };
            }
        }
        return { error: false, message: 'Pin action completed successfully' };
    }
    // Helper method for processing withdrawal (common logic)
    private static async processWithdrawal(user: AuthUser, amount: number, recipient: UserBanks, pointToRemove: number): Promise<CreateWithdrawRequestResponse> {
        // Update user points
        const updateUser = await query.userPoints.update({
            where: { user_id: user.id },
            data: {
                points: { decrement: pointToRemove }
            }
        });
        if (!updateUser) {
            return {
                error: true,
                message: 'Failed to update user points',
            };
        }
        // Create withdrawal request
        const CreateWithdrawal = await query.withdrawalRequest.create({
            data: {
                user_id: user.id,
                amount: Number(amount),
                recipient_code: recipient.recipient_code!,
                reason: `Withdrawal of ${amount} initiate by ${user.username}`,
                status: "pending",
            }
        });
        if (!CreateWithdrawal) {
            return {
                error: true,
                message: 'Failed to process withdrawal',
            };
        }
        // Send notification
        await this.sendWithdrawNotification(user, amount, recipient);
        return {
            error: false,
            message: 'Withdrawal request created successfully',
        };
    }
    // Helper method for sending withdrawal notification
    private static async sendWithdrawNotification(user: AuthUser, amount: number, bank: UserBanks): Promise<void> {
        await query.notifications.create({
            data: {
                user_id: user.id,
                action: "purchase",
                message: `Hi :${GetSinglename(user.name)}, your withdrawal request of ${amount} has been initiated successfully.`,
                read: false,
                notification_id: `NOT${GenerateUniqueId()}`,
                url: "/withdraw/history",
            }
        });
        const sendWithDrawalConfirmation = await EmailService.ConfirmWithdrawalEmail({
            name: GetSinglename(user.name),
            email: user.email,
            accountName: bank.account_name,
            accountNumber: bank.account_number,
            amount: Number(amount).toLocaleString(),
            bankName: bank.bank_name,
        });
        if (sendWithDrawalConfirmation.error) {
            console.error(`Failed to send withdrawal confirmation email: ${sendWithDrawalConfirmation.message}`);
            // Note: Not returning error here as the withdrawal was successful
            // You might want to log this for monitoring purposes
        }
    }
}