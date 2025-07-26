import type { Request, Response } from "express";
import AutomatedMessageService from "@services/AutomatedMessageService";

export default class AutomatedMessageController {
    static async getAutomatedMessages(req: Request, res: Response): Promise<any> {
        try {
            const result = await AutomatedMessageService.getAutomatedMessages(req.user?.id!);

            if (result.error) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: result.message,
                });
            }

            return res.status(200).json({
                status: true,
                error: false,
                message: result.message,
                data: result.data,
            });
        } catch (error: any) {
            console.error("Error in getAutomatedMessages:", error.message);
            return res.status(500).json({
                status: false,
                error: true,
                message: "Internal Server Error",
            });
        }
    }

    static async updateAutomatedMessages(req: Request, res: Response): Promise<any> {
        try {
            const result = await AutomatedMessageService.updateAutomatedMessages(
                req.body,
                req.user!
            );

            if (result.error) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: result.message,
                });
            }

            return res.status(200).json({
                status: true,
                error: false,
                message: result.message,
            });
        } catch (error: any) {
            console.error("Error in updateAutomatedMessages:", error.message);
            return res.status(500).json({
                status: false,
                error: true,
                message: "Internal Server Error",
            });
        }
    }

    static async deleteAutomatedMessage(req: Request, res: Response): Promise<any> {
        try {
            const { messageType } = req.params;

            if (!messageType || !["followers", "subscribers"].includes(messageType)) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: "Invalid message type",
                });
            }

            const result = await AutomatedMessageService.deleteAutomatedMessage(
                req.user?.id!,
                messageType as "followers" | "subscribers"
            );

            if (result.error) {
                return res.status(400).json({
                    status: false,
                    error: true,
                    message: result.message,
                });
            }

            return res.status(200).json({
                status: true,
                error: false,
                message: result.message,
            });
        } catch (error: any) {
            console.error("Error in deleteAutomatedMessage:", error.message);
            return res.status(500).json({
                status: false,
                error: true,
                message: "Internal Server Error",
            });
        }
    }
}