import AdminMiddleware from "@middleware/AdminMiddleware";
import express from "express";
import email from "./admin/email";

const admin = express.Router();


admin.use(AdminMiddleware);
admin.use("/email", email)


export default admin