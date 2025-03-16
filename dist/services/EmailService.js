"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const NodemailerTransporter_1 = __importDefault(require("@libs/NodemailerTransporter"));
const { APP_NAME, MAIL_USER } = process.env;
class EmailService {
    static SendWelcomeEmail(data) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!data)
                return { message: "Invalid request", error: true };
            const RequiredFields = [
                "email",
                "subject",
                "message",
            ];
            const MissingFields = Object.entries(data).filter(([key, value]) => {
                if (RequiredFields.includes(key) && !value) {
                    return key;
                }
                return null;
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
                context: { message, name: "Wisdom Dike" } // Dynamic data
            };
            try {
                yield NodemailerTransporter_1.default.sendMail(mailOptions);
                return { message: "Email sent successfully", error: false };
            }
            catch (error) {
                return { message: error.message, error: true };
            }
        });
    }
}
exports.default = EmailService;
