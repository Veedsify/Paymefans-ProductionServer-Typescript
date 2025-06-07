import { SendCustomEmailProps, SendCustomEmailResponse } from "types/email";
import EmailService from "./EmailService";
import query from "@utils/prisma";

export default class SendCustomEmailService {
    static async SendCustomEmail(emailData: SendCustomEmailProps): Promise<SendCustomEmailResponse> {
        try {
            const { message, subject, recipients } = emailData

            if (!message || !subject || !recipients) {
                throw new Error("Missing required fields: message, subject, or recipients");
            }

            let EmailRecipients: { email: string, name: string }[] = []

            switch (recipients) {
                case "all":
                    EmailRecipients = await query.user.findMany({
                        select: {
                            email: true,
                            name: true,
                        },
                    })
                    break;
                case "support":
                    EmailRecipients = await query.user.findMany({
                        where: {
                            role: "support",
                        },
                        select: {
                            email: true,
                            name: true,
                        },
                    })
                    break;
                case "users":
                    EmailRecipients = await query.user.findMany({
                        where: {
                            role: "fan",
                        },
                        select: {
                            email: true,
                            name: true,
                        },
                    })
                    break;
                case "models":
                    EmailRecipients = await query.user.findMany({
                        where: {
                            is_model: true,
                        },
                        select: {
                            email: true,
                            name: true,
                        },
                    })
                    break;
            }


            if (EmailRecipients.length === 0) {
                throw new Error("No recipients found for the selected option");
            }

            await Promise.all(EmailRecipients.map((recipient) => {
                return EmailService.SendCustomEmail(
                    recipient.name,
                    recipient.email,
                    message,
                    subject,
                )
            }))


            return {
                message: "Email sent successfully",
                error: false,
                statusCode: 200,
            };
        } catch (error: any) {
            console.error("Error sending email:", error);
            throw new Error("Failed to send email");
        }
    }
}