import type {
    EmailServiceProp,
    EmailServiceResponse,
    Product,
    SendEmailResponse,
    SendEmailServiceProp,
    SendNewMessageEmailProps,
} from "../types/email";
import { EmailQueue } from "@jobs/emails/EmailQueueHandler";

export default class EmailService {
    // Send Welcome Email
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
        const options = {
            emailData: {
                email: data.email,
                subject: data.subject,
            },
            template: "welcome.ejs",
            templateData: {
                name: data.name,
                message: data.message,
            },
        };
        try {
            const sendEmail = await EmailQueue.add("welcomeEmail", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
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
                removeOnComplete: true,
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
                removeOnComplete: true,
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

    // Send Two Factor Authentication Email
    static async SendTwoFactorAuthEmail({
        email,
        subject,
        code,
        name,
    }: {
        email: string;
        subject: string;
        code: number;
        name: string;
    }): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!email || !subject || !code || !name) {
                return { message: "Invalid Email Request", error: true };
            }
            const options = {
                emailData: {
                    email,
                    subject,
                },
                template: "verificationCode.ejs",
                templateData: { code, name },
            };
            const sendEmail = await EmailQueue.add("twoFactorAuthEmail", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });
            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }
            return { message: `Email Not Sent`, error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    // New Subscriber Email
    static async NewSubscriberNotification(data: {
        name: string;
        username: string;
        email: string;
        duration: number;
        date: string;
        subscriberId: string;
    }): Promise<{ message: string; error: boolean }> {
        const { name, username, email, subscriberId, duration, date } = data;
        if (!name || !username || !email || !subscriberId) {
            return { message: "Invalid Name Request", error: true };
        }
        try {
            const options = {
                emailData: {
                    subject: `Hello ${name}, you have a new subscriber`,
                    email,
                },
                template: "newSubscriber.ejs",
                templateData: {
                    name,
                    duration,
                    date: new Date(date).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "numeric",
                        day: "numeric",
                    }),
                    username,
                    subscriberId,
                },
            };
            const sendEmail = await EmailQueue.add(
                "newSubscriberNotification",
                options,
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                }
            );
            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }
            return { message: "Email Not Sent", error: true };
        } catch (error: any) {
            throw new Error(error);
        }
    }

    // Two Factor Authentication
    static async ConfirmTwoFactorAuth(name: string, email: string) {
        if (!name || !email) {
            return { message: "Invalid Request", error: true };
        }
        try {
            const options = {
                emailData: {
                    subject: `Two Factor Authentication Confirmation`,
                    email,
                },
                template: "twoFactorAuthentication.ejs",
                templateData: {
                    name,
                    email,
                },
            };
            const sendEmail = await EmailQueue.add(
                "twoFactorAuthentication",
                options,
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                }
            );
            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }
            return { message: "Email Not Sent", error: true };
        } catch (error: any) {
            throw new Error(error);
        }
    }

    // Verification Complete
    static async VerificationComplete(name: string, email: string) {
        if (!name || !email) {
            return { message: "Invalid Request", error: true };
        }
        try {
            const options = {
                emailData: {
                    subject: `Paymefans Model Verifcation Complete`,
                    email,
                },
                template: "verificationComplete.ejs",
                templateData: {
                    name,
                    email,
                },
            };
            const sendEmail = await EmailQueue.add("verificationComplete", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });
            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }
            return { message: "Email Not Sent", error: true };
        } catch (error: any) {
            throw new Error(error);
        }
    }

    // User Account Banned Email
    static async UserBannedEmail(name: string, email: string) {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Account Banned`,
                    email,
                },
                template: "userBanned.ejs",
                templateData: {
                    name,
                    email,
                },
            };

            const sendEmail = await EmailQueue.add("userBanned", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    // Model Welcome Email
    static async ModelWelcomeEmail(name: string, email: string) {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Model Welcome`,
                    email,
                },
                template: "communityWelcome.ejs",
                templateData: {
                    name,
                    email,
                },
            };

            const sendEmail = await EmailQueue.add("modelWelcome", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //   Subscription Confirmation Email
    static async SubscriptionConfirmationEmail(
        name: string,
        username: string,
        duration: number,
        email: string,
        subscriptionId: string
    ) {
        try {
            if (!name || !email || !subscriptionId || !username || !duration) {
                return { message: "Invalid Request", error: true };
            }

            const period =
                duration >= 168
                    ? "6 Months"
                    : duration >= 84
                        ? "3 Months"
                        : duration >= 28
                            ? "1 Month"
                            : duration >= 14
                                ? "1 Week"
                                : duration;

            const options = {
                emailData: {
                    subject: `Paymefans Subscription Confirmation`,
                    email,
                },
                template: "subscriptionConfrimation.ejs",
                templateData: {
                    name,
                    username,
                    email,
                    duration: period,
                    subscriptionId,
                },
            };

            const sendEmail = await EmailQueue.add(
                "subscriptionConfirmation",
                options,
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                }
            );

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //   PassWord Changed Confirmation Email
    static async PasswordChangedConfirmationEmail(
        name: string,
        email: string,
        username: string
    ): Promise<{ message: string; error: boolean }> {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Password Changed Confirmation`,
                    email,
                },
                template: "passwordChanged.ejs",
                templateData: {
                    name,
                    username,
                    email,
                },
            };

            const sendEmail = await EmailQueue.add(
                "passwordChangedConfirmation",
                options,
                {
                    attempts: 3,
                    backoff: 5000,
                    removeOnComplete: true,
                }
            );

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //   User Account Email Verification
    static async EmailVerify(name: string, link: string, email: string) {
        try {
            if (!name || !link || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Email Verification`,
                    email,
                },
                template: "emailVerification.ejs",
                templateData: {
                    name,
                    link,
                    email,
                },
            };

            const sendEmail = await EmailQueue.add("emailVerification", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    // Item Purchase Confirmation
    static async ItemPurchaseConfirmation(
        name: string,
        email: string,
        product: Product
    ): Promise<{ message: string; error: boolean }> {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Email Verification`,
                    email,
                },
                template: "purchaseConfirmation.ejs",
                templateData: {
                    name,
                    product: {
                        ...product,
                        date: new Date(product.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                        }),
                    },
                },
            };

            const sendEmail = await EmailQueue.add("purchaseConfirmation", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    //   Password Reset
    static async PasswordResetEmail(
        name: string,
        email: string,
        username: string,
        resetLink: string
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email || !username) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Password Reset Request`,
                    email,
                },
                template: "passwordReset.ejs",
                templateData: {
                    name,
                    username,
                    resetLink,
                },
            };

            const sendEmail = await EmailQueue.add("passwordReset", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (error: any) {
            throw new Error(error.message);
        }
    }

    //   WithDrawal processing Email
    static async WithdrawalProcessingEmail(
        name: string,
        email: string
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Withdrawal Request Processing`,
                    email,
                },
                template: "withdrawalProcessing.ejs",
                templateData: {
                    name,
                    email,
                },
            };

            const sendEmail = await EmailQueue.add("withdrawalProcessing", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    // Withdrawal Successful Email
    static async WithdrawalSuccessfulEmail(
        name: string,
        email: string,
        amount: number,
        transactionId: string
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Withdrawal Request Successful`,
                    email,
                },
                template: "withdrawalSuccessful.ejs",
                templateData: {
                    name,
                    email,
                    amount,
                    transactionId,
                },
            };

            const sendEmail = await EmailQueue.add("withdrawalSuccessful", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //   Post Gift Sent
    static async PostGiftSentEmail(
        name: string,
        email: string,
        username: string,
        points: number
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email || !username || points <= 0) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Gift Sent`,
                    email,
                },
                template: "giftSent.ejs",
                templateData: {
                    name,
                    username,
                    points,
                },
            };

            const sendEmail = await EmailQueue.add("giftSent", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //  Post Gift Received
    static async PostGiftReceivedEmail(
        name: string,
        email: string,
        username: string,
        points: number
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email || !username || points <= 0) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Paymefans Gift Received`,
                    email,
                },
                template: "giftReceived.ejs",
                templateData: {
                    name,
                    username,
                    points,
                },
            };

            const sendEmail = await EmailQueue.add("giftReceived", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    static async InitilizeWithdrawal(
        name: string,
        email: string,
        code: string,
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email || !code) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Withdrawal Request Received`,
                    email,
                },
                template: "initiateWithdrawal.ejs",
                templateData: {
                    name,
                    code,
                },
            };

            const sendEmail = await EmailQueue.add("initiateWithdrawal", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    //  Custom Email
    static async SendCustomEmail(
        name: string,
        email: string,
        message: string,
        subject: string
    ): Promise<{
        message: string;
        error: boolean;
    }> {
        try {
            if (!name || !email || !message) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject,
                    email,
                },
                template: "customEmail.ejs",
                templateData: {
                    name,
                    subject,
                    message,
                },
            };

            const sendEmail = await EmailQueue.add("customEmail", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }

            return { message: "Email Not Sent", error: true };
        } catch (err: any) {
            throw new Error(err.message);
        }
    }

    // Confirm Withdrawal Email To User

    static async ConfirmWithdrawalEmail(
        { name,
            email,
            amount,
            bankName,
            accountNumber,
            accountName, }: {
                name: string;
                email: string;
                amount: string;
                bankName: string;
                accountNumber: string;
                accountName: string;
            }
    ): Promise<{
        message: string;
        error: boolean;
    }> {

        try {
            if (!name || !email || !amount || !bankName || !accountNumber || !accountName) {
                return { message: "Invalid Request", error: true };
            }

            const options = {
                emailData: {
                    subject: `Withdrawal Request Confirmation`,
                    email,
                },
                template: "confirmWithdrawal.ejs",
                templateData: {
                    name,
                    amount,
                    bankName,
                    accountNumber,
                    accountName,
                    title: "Withdrawal Request Confirmation",
                },
            };

            const sendEmail = await EmailQueue.add("confirmWithdrawal", options, {
                attempts: 3,
                backoff: 5000,
                removeOnComplete: true,
            });

            if (sendEmail) {
                return { message: "Email sent successfully", error: false };
            }
            return { message: "Email Not Sent", error: true };
        }
        catch (err: any) {
            throw new Error(err.message);
        }

    }

}
