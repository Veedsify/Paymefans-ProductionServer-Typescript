import type {
  EmailServiceProp,
  EmailServiceResponse,
  SendEmailResponse,
  SendEmailServiceProp,
  SendNewMessageEmailProps,
} from "../types/email";
import transporter from "@libs/NodemailerTransporter";
import { EmailQueue } from "@jobs/emails/EmailQueueHandler";

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
    try {
      const options = {
        emailData: {
          email,
          subject,
        },
        template: "pointpurchase.ejs",
        templateData: { name, points, transactionId },
      };

      const sendEmail = await EmailQueue.add("pointPurchasEmail", options, {
        attempts: 3,
        backoff: 5000,
      });

      console.log("Email Queue", JSON.stringify(sendEmail));

      if (sendEmail) {
        return { message: "Email sent successfully", error: false };
      }
      return { message: "Email Not Sent", error: true };
    } catch (error: any) {
      throw new Error(error);
    }
  }

  // Send New Message Email
  static async SendNewMessageEmail({
    name,
    email,
    subject,
    link,
  }: SendNewMessageEmailProps): Promise<{
    message: string;
    error: boolean;
  }> {
    try {
      if (!email || !subject || !name || !link) {
        return { message: "Invalid Email Request", error: true };
      }

      const options = {
        emailData: {
          email,
          subject,
        },
        template: "newMessage.ejs",
        templateData: { name, link },
      };

      const sendEmail = await EmailQueue.add("newMessageEmail", options, {
        attempts: 3,
        backoff: 5000,
      });

      console.log("Email Queue", JSON.stringify(sendEmail));

      if (sendEmail) {
        return { message: "Email sent successfully", error: false };
      }

      return { message: `Email Sent Successfully`, error: false };
    } catch (err: any) {
      throw new Error(err.message);
    }
  }
}
