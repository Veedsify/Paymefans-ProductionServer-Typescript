"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const nodemailer_1 = __importDefault(require("nodemailer"));
const nodemailer_express_handlebars_1 = __importDefault(require("nodemailer-express-handlebars"));
const express_handlebars_1 = require("express-handlebars");
const path_1 = __importDefault(require("path"));
const hbsEngine = (0, express_handlebars_1.create)({
    extname: '.hbs',
});
const { MAIL_USER, MAIL_HOST, MAIL_PORT, MAIL_PASS } = process.env;
// 1. Create a transporter
const transporter = nodemailer_1.default.createTransport({
    host: MAIL_HOST,
    port: Number(MAIL_PORT),
    auth: {
        user: MAIL_USER,
        pass: MAIL_PASS,
    }
});
// 2. Set the template engine
transporter.use('compile', (0, nodemailer_express_handlebars_1.default)({
    viewEngine: hbsEngine,
    viewPath: path_1.default.join("../", "views", "emails"),
    extName: '.hbs',
}));
exports.default = transporter;
