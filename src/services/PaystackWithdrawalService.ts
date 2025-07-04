import { PrismaClient, WithdrawalRequestStatus } from '@prisma/client';
import axios from 'axios';
import { WithdrawalRequestWithPaystack, WithdrawalFeeCalculator } from '../types/withdrawal';

const prisma = new PrismaClient();

export class PaystackWithdrawalService {
    private readonly secretKey: string;
    private readonly baseUrl: string;

    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
        this.baseUrl = process.env.PAYSTACK_PAYMENT_URL || 'https://api.paystack.co';

        if (!this.secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY is required');
        }
    }

    private getHeaders() {
        return {
            'Authorization': `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
        };
    }

    /**
     * Create a transfer recipient
     */
    async createTransferRecipient(data: {
        account_name: string;
        account_number: string;
        bank_code: string;
    }) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/transferrecipient`,
                {
                    type: 'nuban',
                    name: data.account_name,
                    account_number: data.account_number,
                    bank_code: data.bank_code,
                    currency: 'NGN',
                },
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    recipient_code: response.data.data.recipient_code,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to create transfer recipient',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Create Recipient Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }

    /**
     * Initiate a transfer
     */
    async initiateTransfer(data: {
        amount: number;
        recipient_code: string;
        reason?: string;
    }) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/transfer`,
                {
                    source: 'balance',
                    amount: data.amount * 100, // Convert to kobo
                    recipient: data.recipient_code,
                    reason: data.reason || 'Withdrawal request',
                },
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    transfer_code: response.data.data.transfer_code,
                    reference: response.data.data.reference,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to initiate transfer',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Transfer Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }

    /**
     * Finalize transfer with OTP
     */
    async finalizeTransfer(transferCode: string, otp: string) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/transfer/finalize_transfer`,
                {
                    transfer_code: transferCode,
                    otp: otp,
                },
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    message: response.data.message,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to finalize transfer',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Finalize Transfer Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }

    /**
     * Verify transfer status
     */
    async verifyTransfer(reference: string) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/transfer/verify/${reference}`,
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to verify transfer',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Verify Transfer Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }

    /**
     * Get list of banks
     */
    async getBanks() {
        try {
            const response = await axios.get(
                `${this.baseUrl}/bank`,
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to fetch banks',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Get Banks Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }

    /**
     * Resolve account number
     */
    async resolveAccount(accountNumber: string, bankCode: string) {
        try {
            const response = await axios.get(
                `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
                { headers: this.getHeaders() }
            );

            if (response.data.status) {
                return {
                    success: true,
                    data: response.data.data,
                    account_name: response.data.data.account_name,
                };
            }

            return {
                success: false,
                message: response.data.message || 'Failed to resolve account',
                data: response.data,
            };
        } catch (error: any) {
            console.error('Paystack Resolve Account Error:', error.message);
            return {
                success: false,
                message: 'Service error occurred',
            };
        }
    }
}

/**
 * Withdrawal Request Service using Prisma
 */
export class WithdrawalRequestService {
    private paystackService: PaystackWithdrawalService;

    constructor() {
        this.paystackService = new PaystackWithdrawalService();
    }

    /**
     * Get withdrawal request by ID
     */
    async getWithdrawalRequest(id: number): Promise<WithdrawalRequestWithPaystack | null> {
        try {
            const withdrawal = await prisma.withdrawalRequest.findUnique({
                where: { id },
                include: {
                    user: true,
                    bank: true,
                },
            });

            return withdrawal as WithdrawalRequestWithPaystack | null;
        } catch (error) {
            console.error('Error fetching withdrawal request:', error);
            return null;
        }
    }

    /**
     * Update withdrawal request
     */
    async updateWithdrawalRequest(
        id: number,
        data: Partial<WithdrawalRequestWithPaystack>
    ): Promise<WithdrawalRequestWithPaystack | null> {
        try {
            const withdrawal = await prisma.withdrawalRequest.update({
                where: { id },
                data,
                include: {
                    user: true,
                    bank: true,
                },
            });

            return withdrawal as WithdrawalRequestWithPaystack;
        } catch (error) {
            console.error('Error updating withdrawal request:', error);
            return null;
        }
    }

    /**
     * Process withdrawal with Paystack
     */
    async processWithdrawal(id: number): Promise<{
        success: boolean;
        message: string;
        transfer_code?: string;
        reference?: string;
    }> {
        try {
            const withdrawal = await this.getWithdrawalRequest(id);

            if (!withdrawal) {
                return { success: false, message: 'Withdrawal request not found' };
            }

            if (withdrawal.status !== 'pending') {
                return { success: false, message: 'Withdrawal request is not pending' };
            }

            // Calculate amount after fee
            const amountAfterFee = WithdrawalFeeCalculator.calculateAmountAfterFee(withdrawal.amount);

            // Create recipient if not exists
            if (!withdrawal.recipient_code && withdrawal.bank) {
                const recipientResult = await this.paystackService.createTransferRecipient({
                    account_name: withdrawal.bank.account_name,
                    account_number: withdrawal.bank.account_number,
                    bank_code: withdrawal.bank.bank_id,
                });

                if (!recipientResult.success) {
                    return { success: false, message: recipientResult.message || 'Failed to create recipient' };
                }

                // Update withdrawal with recipient code
                await this.updateWithdrawalRequest(id, {
                    recipient_code: recipientResult.recipient_code,
                });

                withdrawal.recipient_code = recipientResult.recipient_code;
            }

            // Update status to processing
            await this.updateWithdrawalRequest(id, {
                status: WithdrawalRequestStatus.processing,
            });

            // Initiate transfer
            const transferResult = await this.paystackService.initiateTransfer({
                amount: amountAfterFee,
                recipient_code: withdrawal.recipient_code,
                reason: withdrawal.reason,
            });

            if (transferResult.success) {
                // Update withdrawal with transfer details
                await this.updateWithdrawalRequest(id, {
                    transfer_code: transferResult.transfer_code,
                    reference: transferResult.reference,
                    paystack_response: transferResult.data,
                });

                return {
                    success: true,
                    message: 'Transfer initiated successfully',
                    transfer_code: transferResult.transfer_code,
                    reference: transferResult.reference,
                };
            } else {
                // Revert status back to pending
                await this.updateWithdrawalRequest(id, {
                    status: WithdrawalRequestStatus.pending,
                });

                return { success: false, message: transferResult.message || 'Failed to initiate transfer' };
            }
        } catch (error) {
            console.error('Error processing withdrawal:', error);
            return { success: false, message: 'Internal server error' };
        }
    }

    /**
     * Finalize withdrawal with OTP
     */
    async finalizeWithdrawal(id: number, otp: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const withdrawal = await this.getWithdrawalRequest(id);

            if (!withdrawal) {
                return { success: false, message: 'Withdrawal request not found' };
            }

            if (!withdrawal.transfer_code) {
                return { success: false, message: 'Transfer not initiated' };
            }

            const finalizeResult = await this.paystackService.finalizeTransfer(
                withdrawal.transfer_code,
                otp
            );

            if (finalizeResult.success) {
                // Update withdrawal status to approved
                await this.updateWithdrawalRequest(id, {
                    status: WithdrawalRequestStatus.approved,
                    paystack_response: finalizeResult.data,
                });

                return {
                    success: true,
                    message: 'Withdrawal completed successfully',
                };
            } else {
                return { success: false, message: finalizeResult.message || 'Failed to finalize transfer' };
            }
        } catch (error) {
            console.error('Error finalizing withdrawal:', error);
            return { success: false, message: 'Internal server error' };
        }
    }
}
