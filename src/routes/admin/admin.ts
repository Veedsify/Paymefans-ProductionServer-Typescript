import AdminNotificationController from "@controllers/AdminNotificationController";
import AdminPointsController from "@controllers/AdminPointsController";
import AdminWithdrawalController from "@controllers/AdminWithdrawalController";
import EmailController from "@controllers/EmailController";
import { Router } from "express";

const admin = Router();

// Notification routes
admin.post(
  "/notifications/create",
  AdminNotificationController.CreateNotification,
);

// Points routes
admin.post("/points/update", AdminPointsController.UpdateUserPoints);
admin.get(
  "/points/balance/:user_id",
  AdminPointsController.GetUserPointsBalance,
);

// Withdrawal routes
admin.post("/withdrawal/reject", AdminWithdrawalController.rejectWithdrawal);
admin.post("/withdrawal/approve", AdminWithdrawalController.approveWithdrawal);
admin.get(
  "/withdrawal/:withdrawal_id",
  AdminWithdrawalController.getWithdrawal,
);
admin.get("/withdrawals", AdminWithdrawalController.getWithdrawals);
admin.get("/withdrawal-stats", AdminWithdrawalController.getWithdrawalStats);

// Additional notification routes
admin.post(
  "/notifications/bulk",
  AdminNotificationController.CreateBulkNotifications,
);
admin.get("/notifications", AdminNotificationController.GetAllNotifications);
admin.delete(
  "/notifications/:notification_id",
  AdminNotificationController.DeleteNotification,
);
admin.patch(
  "/notifications/:notification_id/status",
  AdminNotificationController.UpdateNotificationStatus,
);

// Additional points routes
admin.get("/points/stats", AdminPointsController.GetPointsStatistics);
admin.get(
  "/points/history/:user_id",
  AdminPointsController.GetUserPointsHistory,
);
admin.post("/points/transfer", AdminPointsController.TransferPoints);
admin.get("/points/users", AdminPointsController.GetMultipleUsersPoints);

// Email routes
admin.post("/custom-email", EmailController.SendCustomEmail);

export default admin;
