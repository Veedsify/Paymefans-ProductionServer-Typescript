import { SendPointPurchaseEmailTemplate } from "../emails/SendPointPurchase";
import type {
  EmailServiceProp,
  EmailServiceResponse,
  SendEmailResponse,
  SendEmailServiceProp,
} from "../types/email";
import transporter from "@libs/NodemailerTransporter";

const { APP_NAME, MAIL_USER } = process.env;

export default class EmailService {
  static async SendWelcomeEmail(
    data: EmailServiceProp
  ): Promise<EmailServiceResponse> {
    if (!data) return { message: "Invalid request", error: true };

    const RequiredFields = ["email", "subject", "message"];

    const MissingFields = Object.entries(data)
      .filter(([key, value]) => {
        if (RequiredFields.includes(key) && !value) {
          return key;
        }
        return null;
      })
      .map(([key]) => key)
      .join(", ");

    if (MissingFields) {
      return {
        message: `Sorry, ${MissingFields} field is missing`,
        error: true,
      };
    }
    const { email, subject, message } = data;
    const mailOptions = {
      from: `${APP_NAME} <${MAIL_USER}>`,
      to: email,
      subject: subject,
      template: "welcome", // Name of the Handlebars template
      context: { message, name: "Wisdom Dike" }, // Dynamic data
    };

    try {
      await transporter.sendMail(mailOptions);
      return { message: "Email sent successfully", error: false };
    } catch (error: any) {
      return { message: error.message, error: true };
    }
  }
  // Send Point Purchase Email
  static async SendPointPurchaseEmail(
    data: SendEmailServiceProp
  ): Promise<SendEmailResponse> {
    if (!data) return { message: "Invalid Email Request", error: true };
    const { email, subject, name, points, transactionId } = data;
    if (!email || !subject || !name || !points || !transactionId) {
      return { message: "Invalid Email Request", error: true };
    }
    // Send Email
    try {
      const mailOptions = {
        from: `${APP_NAME}`,
        to: email,
        subject: subject, 
        html: SendPointPurchaseEmailTemplate({ name, points, transactionId }), // Name of the Handlebars template
      };
      const result = await transporter.sendMail(mailOptions);
      console.log(result);
      return { message: "Email sent successfully", error: false };
    } catch (error: any) {
      throw new Error(error);
    }
  }


}
