import type { Request, Response } from "express";
import NotificationService from "@services/NotificationService";

export default class AdminNotificationController {
  /**
   * Create a notification for a user (Admin endpoint)
   */
  static async CreateNotification(req: Request, res: Response): Promise<void> {
    try {
      const { user_id, message, action = "message", url = null } = req.body;

      const notification = await NotificationService.createNotification({
        user_id,
        message,
        action,
        url,
      });

      res.status(200).json({
        error: false,
        message: "Notification created successfully",
        data: notification,
      });
    } catch (err: any) {
      console.log("CreateNotification error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong creating notification",
      });
    }
  }

  /**
   * Create bulk notifications for multiple users (Admin endpoint)
   */
  static async CreateBulkNotifications(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { user_ids, message, action = "message", url = null } = req.body;

      const notifications = await NotificationService.createBulkNotifications(
        user_ids,
        message,
        action,
        url,
      );

      res.status(200).json({
        error: false,
        message: "Bulk notifications created successfully",
        data: {
          created_count: notifications.length,
          notifications,
        },
      });
    } catch (err: any) {
      console.log("CreateBulkNotifications error:", err);
      res.status(500).json({
        error: true,
        message:
          err.message || "Something went wrong creating bulk notifications",
      });
    }
  }

  /**
   * Get all notifications with pagination (Admin endpoint)
   */
  static async GetAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { page = "1", limit = "20", user_id, read } = req.query;

      const result = await NotificationService.getAllNotifications({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        user_id: user_id as string,
        read: read === "true" ? true : read === "false" ? false : undefined,
      });

      res.status(200).json({
        error: false,
        data: result.notifications,
        pagination: result.pagination,
      });
    } catch (err: any) {
      console.log("GetAllNotifications error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong getting notifications",
      });
    }
  }

  /**
   * Delete a notification (Admin endpoint)
   */
  static async DeleteNotification(req: Request, res: Response): Promise<void> {
    try {
      const { notification_id } = req.params;

      if (!notification_id) {
        res.status(400).json({
          error: true,
          message: "notification_id is required",
        });
        return;
      }

      await NotificationService.deleteNotification(parseInt(notification_id));

      res.status(200).json({
        error: false,
        message: "Notification deleted successfully",
      });
    } catch (err: any) {
      console.log("DeleteNotification error:", err);
      res.status(500).json({
        error: true,
        message: err.message || "Something went wrong deleting notification",
      });
    }
  }

  /**
   * Update notification status (Admin endpoint)
   */
  static async UpdateNotificationStatus(
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      const { notification_id } = req.params;
      const { read } = req.body;

      if (!notification_id || read === undefined) {
        res.status(400).json({
          error: true,
          message: "notification_id and read status are required",
        });
        return;
      }

      const notification = await NotificationService.updateNotificationStatus(
        parseInt(notification_id),
        read,
      );

      res.status(200).json({
        error: false,
        message: "Notification status updated successfully",
        data: notification,
      });
    } catch (err: any) {
      console.log("UpdateNotificationStatus error:", err);
      res.status(500).json({
        error: true,
        message:
          err.message || "Something went wrong updating notification status",
      });
    }
  }
}
