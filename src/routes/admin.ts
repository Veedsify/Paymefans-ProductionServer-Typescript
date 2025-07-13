import AdminMiddleware from "@middleware/AdminMiddleware";
import express from "express";
import email from "./admin/email";
import adminRoutes from "./admin/admin";

const admin = express.Router();
admin.get("/health", async (_, res) => {
  res.status(200).json({
    status: "ok",
    message: "Admin API is running",
    timestamp: new Date().toISOString(),
  });
});


admin.use(AdminMiddleware);
admin.use("/email", email);
admin.use("/", adminRoutes);

export default admin;
