import nodemailer from 'nodemailer';
// import hbs from 'nodemailer-express-handlebars';
// import { create } from 'express-handlebars';
// import path from 'path';

// const hbsEngine = create({
//   extname: '.hbs',
// });

const { MAIL_USER, MAIL_HOST, MAIL_PORT, MAIL_PASS } = process.env;

// 1. Create a transporter
const transporter = nodemailer.createTransport({
      host: MAIL_HOST,
      port: Number(MAIL_PORT),
      auth: {
            user: MAIL_USER,
            pass: MAIL_PASS,
      }
});


// 2. Set the template engine
// transporter.use('compile', hbs({
//       viewEngine: hbsEngine,
//       viewPath: path.join("views/emails/"),
//       extName: '.hbs',
// }));

export default transporter;
