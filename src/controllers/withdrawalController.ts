import { Request, Response } from 'express';
import { WithdrawalRequestService } from '../services/PaystackWithdrawalService';
import { WithdrawalFeeCalculator } from '../types/withdrawal';

const withdrawalService = new WithdrawalRequestService();

/**
 * Get withdrawal request details
 */
export const getWithdrawalRequest = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const withdrawalId = parseInt(id);

        if (isNaN(withdrawalId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid withdrawal ID',
            });
            return;
        }

        const withdrawal = await withdrawalService.getWithdrawalRequest(withdrawalId);

        if (!withdrawal) {
            res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
            });
            return;
        }

        // Calculate fees for display
        const platformFee = WithdrawalFeeCalculator.calculatePlatformFee(withdrawal.amount);
        const amountAfterFee = WithdrawalFeeCalculator.calculateAmountAfterFee(withdrawal.amount);

        res.json({
            success: true,
            data: {
                ...withdrawal,
                platform_fee: platformFee,
                amount_after_fee: amountAfterFee,
                fee_percentage: WithdrawalFeeCalculator.getFeePercentage(),
            },
        });
    } catch (error) {
        console.error('Error fetching withdrawal request:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

/**
 * Initiate withdrawal process
 */
export const initiateWithdrawal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const withdrawalId = parseInt(id);

        if (isNaN(withdrawalId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid withdrawal ID',
            });
            return;
        }

        const result = await withdrawalService.processWithdrawal(withdrawalId);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                data: {
                    transfer_code: result.transfer_code,
                    reference: result.reference,
                },
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error) {
        console.error('Error initiating withdrawal:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

/**
 * Finalize withdrawal with OTP
 */
export const finalizeWithdrawal = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { otp } = req.body;
        const withdrawalId = parseInt(id);

        if (isNaN(withdrawalId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid withdrawal ID',
            });
            return;
        }

        if (!otp || otp.length !== 6) {
            res.status(400).json({
                success: false,
                message: 'Valid 6-digit OTP is required',
            });
            return;
        }

        const result = await withdrawalService.finalizeWithdrawal(withdrawalId, otp);

        if (result.success) {
            res.json({
                success: true,
                message: result.message,
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message,
            });
        }
    } catch (error) {
        console.error('Error finalizing withdrawal:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};

/**
 * Update withdrawal status
 */
export const updateWithdrawalStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status, reason } = req.body;
        const withdrawalId = parseInt(id);

        if (isNaN(withdrawalId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid withdrawal ID',
            });
            return;
        }

        const validStatuses = ['pending', 'processing', 'approved', 'rejected', 'completed'];
        if (!validStatuses.includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status',
            });
            return;
        }

        const updateData: any = { status };
        if (reason) {
            updateData.reason = reason;
        }

        const withdrawal = await withdrawalService.updateWithdrawalRequest(withdrawalId, updateData);

        if (withdrawal) {
            res.json({
                success: true,
                message: 'Withdrawal status updated successfully',
                data: withdrawal,
            });
        } else {
            res.status(404).json({
                success: false,
                message: 'Withdrawal request not found',
            });
        }
    } catch (error) {
        console.error('Error updating withdrawal status:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
};
