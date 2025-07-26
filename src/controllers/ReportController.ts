import { Request, Response } from "express";
import ReportService from "@services/ReportService";

class ReportController {
    static async reportUser(req: Request, res: Response):Promise<any> {
        try {
            const { reported_id, report_type, report } = req.body;
            const user_id = req.user?.id;

            if (!user_id) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized"
                });
            }

            if (!reported_id || !report_type || !report) {
                return res.status(400).json({
                    success: false,
                    message: "Missing required fields: reported_id, report_type, and report"
                });
            }

            // Prevent users from reporting themselves
            if (user_id === reported_id) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot report yourself"
                });
            }

            const result = await ReportService.reportUser({
                user_id,
                reported_id: reported_id.toString(),
                report_type,
                report
            });

            if (result.success) {
                return res.status(201).json({
                    success: true,
                    message: "Report submitted successfully",
                    data: result.data
                });
            } else {
                return res.status(400).json({
                    success: false,
                    message: result.message
                });
            }
        } catch (error) {
            console.error("Error in reportUser:", error);
            return res.status(500).json({
                success: false,
                message: "Internal server error"
            });
        }
    }
}

export default ReportController;