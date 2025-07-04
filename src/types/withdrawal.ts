import { WithdrawalRequestStatus } from '@prisma/client';

// Enhanced WithdrawalRequest interface with Paystack fields
export interface WithdrawalRequestWithPaystack {
    id: number;
    user_id: number;
    amount: number;
    recipient_code: string;
    bank_account_id: number;
    reference: string | null;
    reason: string;
    status: WithdrawalRequestStatus;
    transfer_code: string | null;
    paystack_response: any | null; // JSON field for Paystack API responses
    created_at: Date;
    updated_at: Date;
    // Relations
    bank?: any;
    user?: any;
}

// Paystack service response types
export interface PaystackTransferRecipient {
    recipient_code: string;
    type: string;
    name: string;
    account_number: string;
    bank_code: string;
    currency: string;
}

export interface PaystackTransferResponse {
    transfer_code: string;
    reference: string;
    amount: number;
    currency: string;
    recipient: PaystackTransferRecipient;
    status: string;
}

export interface PaystackFinalizeResponse {
    status: string;
    message: string;
    data: {
        domain: string;
        amount: number;
        currency: string;
        reference: string;
        status: string;
        transfer_code: string;
        transferred_at: string;
    };
}

// Fee calculation utilities (matching Laravel admin logic)
export class WithdrawalFeeCalculator {
    private static readonly FEE_PERCENTAGE = 0.25; // 25% platform fee

    static calculatePlatformFee(amount: number): number {
        return Math.floor(amount * this.FEE_PERCENTAGE);
    }

    static calculateAmountAfterFee(amount: number): number {
        return Math.floor(amount * (1 - this.FEE_PERCENTAGE));
    }

    static getFeePercentage(): number {
        return this.FEE_PERCENTAGE * 100; // Return as percentage
    }
}

// Withdrawal request status helpers
export const WithdrawalStatusLabels = {
    pending: 'Pending',
    processing: 'Processing',
    approved: 'Approved',
    rejected: 'Rejected',
    completed: 'Completed'
} as const;

export const WithdrawalStatusColors = {
    pending: 'yellow',
    processing: 'blue',
    approved: 'green',
    rejected: 'red',
    completed: 'green'
} as const;
