import AdminMiddleware from "@middleware/AdminMiddleware";
import express from "express";
import email from "./admin/email";
import adminRoutes from "./admin/admin";

const admin = express.Router();

// Health check endpoint (no auth required)
admin.get("/health", async (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Admin API is running",
    timestamp: new Date().toISOString(),
  });
});

// Test endpoints that bypass admin middleware for debugging
// Remove these in production
admin.post("/test/points/update", (req, res) => {
  console.log("Test points update called with:", req.body);
  const { user_id, points, operation = "add" } = req.body;

  if (!user_id || points === undefined) {
    res.status(400).json({
      error: true,
      message: "user_id and points are required",
    });
    return;
  }

  // Simulate successful response for testing
  res.status(200).json({
    error: false,
    message: `User points ${operation === "add" ? "added" : "deducted"} successfully (TEST MODE)`,
    data: {
      user_id: user_id,
      points: operation === "add" ? points : Math.max(0, points),
      operation: operation,
      amount: points,
    },
  });
});

admin.get("/test/points/balance/:user_id", (req, res) => {
  console.log("Test points balance called for user_id:", req.params.user_id);

  // Simulate successful response for testing
  res.status(200).json({
    error: false,
    points: 1000, // Simulated balance
    conversion_rate: 1.0,
  });
});

admin.use(AdminMiddleware);
admin.use("/email", email);
admin.use("/", adminRoutes);

export default admin;
