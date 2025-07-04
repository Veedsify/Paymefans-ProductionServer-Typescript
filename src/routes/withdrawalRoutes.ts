import { Router } from 'express';
import {
    getWithdrawalRequest,
    initiateWithdrawal,
    finalizeWithdrawal,
    updateWithdrawalStatus,
} from '../controllers/withdrawalController';

const router = Router();

// Withdrawal routes
router.get('/:id', getWithdrawalRequest);
router.post('/:id/initiate', initiateWithdrawal);
router.post('/:id/finalize', finalizeWithdrawal);
router.patch('/:id/status', updateWithdrawalStatus);

export default router;
