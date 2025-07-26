import query from "@utils/prisma";
import { v4 as uuidv4 } from "uuid";


interface ReportUserData {
    user_id: number;
    reported_id: string;
    report_type: string;
    report: string;
}

class ReportService {
    static async reportUser(data: ReportUserData) {
        try {
            // Check if the reported user exists
            const reportedUser = await query.user.findUnique({
                where: { id: parseInt(data.reported_id) }
            });

            if (!reportedUser) {
                return {
                    success: false,
                    message: "Reported user not found"
                };
            }

            // Check if user has already reported this user with the same type
            const existingReport = await query.reportUser.findFirst({
                where: {
                    user_id: data.user_id,
                    reported_id: data.reported_id,
                    report_type: data.report_type
                }
            });

            if (existingReport) {
                return {
                    success: false,
                    message: "You have already reported this user for this reason"
                };
            }

            // Create the report
            const report = await query.reportUser.create({
                data: {
                    report_id: uuidv4(),
                    user_id: data.user_id,
                    reported_id: data.reported_id,
                    report_type: data.report_type,
                    report: data.report
                }
            });

            return {
                success: true,
                message: "Report submitted successfully",
                data: report
            };
        } catch (error) {
            console.error("Error in ReportService.reportUser:", error);
            return {
                success: false,
                message: "Failed to submit report"
            };
        }
    }
}

export default ReportService;