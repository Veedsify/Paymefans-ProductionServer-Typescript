import SendCustomEmailService from "@services/SendCustomEmailService";
import { Request, Response } from "express";
export default class EmailController {
    // Send custom email from admin panel
    // @route POST /admin/email/custom-email
    static async SendCustomEmail(req: Request, res: Response): Promise<any> {
        try {
            const sendCustomEmail = await SendCustomEmailService.SendCustomEmail(req.body);
            if (sendCustomEmail.error) {
                return res.status(500).json(sendCustomEmail);
            }
            res.status(200).json(sendCustomEmail);
        } catch (error: any) {
            console.error("Error sending email:", error);
            res.status(500).json({ message: "Failed to send email" });
        }
    }
}