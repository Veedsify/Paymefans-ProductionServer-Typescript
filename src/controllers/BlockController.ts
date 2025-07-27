import type { Request, Response } from "express";
import BlockService from "@services/BlockService";
import type { AuthUser } from "types/user";

export default class BlockController {
    // Block a user
    static async BlockUser(req: Request, res: Response): Promise<any> {
        try {
            const userId = req?.user?.id as number;
            const blockUser = await BlockService.BlockUser(userId, req.body);

            if (blockUser.error) {
                return res.status(400).json({ ...blockUser });
            }

            return res.status(200).json({ ...blockUser });
        } catch (err: any) {
            return res.status(500).json({
                status: false,
                message: err.message,
                error: true
            });
        }
    }

    // Unblock a user
    static async UnblockUser(req: Request, res: Response): Promise<any> {
        try {
            const userId = req?.user?.id as number;
            const unblockUser = await BlockService.UnblockUser(userId, req.body);

            if (unblockUser.error) {
                return res.status(400).json({ ...unblockUser });
            }

            return res.status(200).json({ ...unblockUser });
        } catch (err: any) {
            return res.status(500).json({
                status: false,
                message: err.message,
                error: true
            });
        }
    }

    // Check if user is blocked
    static async CheckBlockStatus(req: Request, res: Response): Promise<any> {
        try {
            const userId = req?.user?.id as number;
            const { targetUserId } = req.body;

            const checkBlock = await BlockService.CheckBlockStatus({
                userId,
                targetUserId: parseInt(targetUserId)
            });

            if (checkBlock.error) {
                return res.status(400).json({ ...checkBlock });
            }

            return res.status(200).json({ ...checkBlock });
        } catch (err: any) {
            return res.status(500).json({
                status: false,
                message: err.message,
                error: true
            });
        }
    }

    // Check if current user is blocked by another user
    static async CheckIfBlockedBy(req: Request, res: Response): Promise<any> {
        try {
            const userId = req?.user?.id as number;
            const { targetUserId } = req.body;

            const checkBlock = await BlockService.CheckIfBlockedBy(
                userId,
                parseInt(targetUserId)
            );

            if (checkBlock.error) {
                return res.status(400).json({ ...checkBlock });
            }

            return res.status(200).json({ ...checkBlock });
        } catch (err: any) {
            return res.status(500).json({
                status: false,
                message: err.message,
                error: true
            });
        }
    }

    // Get all blocked users
    static async GetBlockedUsers(req: Request, res: Response): Promise<any> {
        try {
            const getBlockedUsers = await BlockService.GetBlockedUsers({
                query: req.query as any,
                user: req?.user as AuthUser
            });

            if (getBlockedUsers.error) {
                return res.status(400).json({ ...getBlockedUsers });
            }

            return res.status(200).json({ ...getBlockedUsers });
        } catch (err: any) {
            return res.status(500).json({
                status: false,
                message: err.message,
                error: true
            });
        }
    }
}
