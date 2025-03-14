import { EmailServiceProp, EmailServiceResponse } from "../types/email";
import transporter from "../libs/NodemailerTransporter";

const { APP_NAME, MAIL_USER } = process.env;

export default class EmailService {

      static async SendWelcomeEmail(data: EmailServiceProp): Promise<EmailServiceResponse> {
            if (!data) return { message: "Invalid request", error: true };

            const RequiredFields = [
                  "email",
                  "subject",
                  "message",
            ];

            const MissingFields = Object.entries(data).filter(([key, value]) => {
                  if (RequiredFields.includes(key) && !value) {
                        return key;
                  }
            }).map(([key]) => key).join(", ");

            if (MissingFields) {
                  return { message: `Sorry, ${MissingFields} field is missing`, error: true };
            }
            const { email, subject, message } = data;
            const mailOptions = {
                  from: `${APP_NAME} <${MAIL_USER}>`,
                  to: email,
                  subject: subject,
                  template: 'welcome', // Name of the Handlebars template
                  context: { message } // Dynamic data
            };

            try {
                  await transporter.sendMail(mailOptions);
                  return { message: "Email sent successfully", error: false };
            } catch (error: any) {
                  return { message: error.message, error: true };
            }
      }
}
