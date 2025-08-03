
import SupportService from "@services/SupportService";
import type { Request, Response } from "express";

export default class SupportController {
    /**
     * Create a new support ticket
     */
    static async CreateSupportTicket(req: Request, res: Response): Promise<any> {
        try {
            const { subject, message, name, email } = req.body;
            const userId = req.user?.id;

            // Validate required fields
            if (!subject || !message || !name || !email) {
                return res.status(400).json({
                    error: true,
                    message: "Subject, message, name, and email are required",
                });
            }

            const result = await SupportService.CreateSupportTicket({
                userId,
                subject,
                message,
                name,
                email,
            });

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error: any) {
            console.error("Error creating support ticket:", error.message);
            res.status(500).json({
                error: true,
                message: "An error occurred while creating support ticket",
            });
        }
    }

    /**
     * Get user's support tickets
     */
    static async GetUserSupportTickets(req: Request, res: Response): Promise<any> {
        try {
            const userId = req.user?.id;
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 10;

            if (!userId) {
                return res.status(401).json({
                    error: true,
                    message: "User not authenticated",
                });
            }

            const result = await SupportService.GetUserSupportTickets(userId, page, limit);

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Error getting user support tickets:", error.message);
            res.status(500).json({
                error: true,
                message: "An error occurred while getting support tickets",
            });
        }
    }

    /**
     * Get a specific support ticket by ticket ID
     */
    static async GetSupportTicket(req: Request, res: Response): Promise<any> {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.id;

            if (!ticketId) {
                return res.status(400).json({
                    error: true,
                    message: "Ticket ID is required",
                });
            }

            const result = await SupportService.GetSupportTicket(ticketId, userId);

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Error getting support ticket:", error.message);
            res.status(500).json({
                error: true,
                message: "An error occurred while getting support ticket",
            });
        }
    }

    /**
     * Reply to a support ticket
     */
    static async ReplySupportTicket(req: Request, res: Response): Promise<any> {
        try {
            const { ticketId } = req.params;
            const { message } = req.body;
            const userId = req.user?.id!;

            if (!ticketId || !message) {
                return res.status(400).json({
                    error: true,
                    message: "Ticket ID and message are required",
                });
            }

            const result = await SupportService.ReplySupportTicket(ticketId, userId, message);

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(201).json(result);
        } catch (error: any) {
            console.error("Error replying to support ticket:", error.message);
            res.status(500).json({
                error: true,
                message: "An error occurred while replying to support ticket",
            });
        }
    }

    /**
     * Close a support ticket
     */
    static async CloseSupportTicket(req: Request, res: Response): Promise<any> {
        try {
            const { ticketId } = req.params;
            const userId = req.user?.id!;

            if (!ticketId) {
                return res.status(400).json({
                    error: true,
                    message: "Ticket ID is required",
                });
            }

            const result = await SupportService.CloseSupportTicket(ticketId, userId);

            if (result.error) {
                return res.status(400).json(result);
            }

            res.status(200).json(result);
        } catch (error: any) {
            console.error("Error closing support ticket:", error.message);
            res.status(500).json({
                error: true,
                message: "An error occurred while closing support ticket",
            });
        }
    }
}
