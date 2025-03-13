import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';
const { MAIL_USER, MAIL_HOST, MAIL_PORT, MAIL_PASS, APP_NAME } = process.env;

// 1. Create a transporter
const transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: Number(MAIL_PORT),
      auth: {
            user: MAIL_USER,
            pass: MAIL_PASS,
      }
});

// 2. Configure Handlebars template engine
transporter.use('compile', hbs({
      viewEngine: {
            extname: '.hbs',
            partialsDir: path.join(__dirname, "../", 'views/emails'),
            defaultLayout: false,
      },
      viewPath: path.join(__dirname, "../", 'views/emails'),
      extName: '.hbs',
}));

export default transporter;
