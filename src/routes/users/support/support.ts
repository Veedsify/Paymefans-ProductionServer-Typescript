import { startSession, listSessions, joinSession, endSession, pushSession, sendMessage, getMessages, submitReview, leaveSession } from '@controllers/supportController';
import { Router } from 'express';

const router = Router();

router.post('/session', startSession);
router.get('/session', listSessions);
router.patch('/session/join', joinSession);
router.patch('/session/end', endSession);
router.patch('/session/push', pushSession);
router.patch('/session/leave', leaveSession);

router.post('/message', sendMessage);
router.get('/messages', getMessages);

router.post('/review', submitReview);

export default router; 