import type { Request, Response } from "express";
import NotificationService from "@services/NotificationService";

export default class NotificationController {
      // Get My Notifications
      // This function is used to get the notifications of the user
      static async GetMyNotifications(req: Request, res: Response): Promise<void> {
            try {
                  const notifications = await NotificationService.MyNotifications({ page: req.params.page as string, userId: req.user!.id as number })
                  if (notifications.error) {
                        res.status(400).json(notifications)
                        return;
                  }    
                  res.status(200).json({
                        error: false,
                        data: {
                              notifications: notifications.data,
                              totalNotifications: notifications.data?.length || 0,
                              hasMore: notifications.hasMore
                        }
                  })
            }
            catch (err: any) {
                  console.log(err);
                  res.status(500).json({
                        error: true,
                        message: "Something went wrong",
                  })
            }
      }

      // Get Unread Notifications Count
      // This function is used to get the count of unread notifications
      static async GetUnreadCount(req: Request, res: Response): Promise<void> {
            try {
                  const result = await NotificationService.GetUnreadNotifications(req.user!.user_id as string)
                  if (result.error) {
                        res.status(400).json(result);
                        return;
                  }
                  res.status(200).json({
                        error: false,
                        count: result.data
                  });
            }
            catch (err: any) {
                  console.log(err);
                  res.status(500).json({
                        error: true,
                        message: "Something went wrong",
                  })
            }
      }

      // Read Notification
      // This function is used to read the notification
      static async ReadNotification(req: Request, res: Response): Promise<void> {
            try {
                  const notification = await NotificationService.ReadNotification(req.params.id as string, req.user!.id as number)
                  if (notification.error) {
                        res.status(400).json(notification);
                        return;
                  }
                  res.status(200).json(notification);
            }
            catch (err: any) {
                  console.log(err);
                  res.status(500).json({
                        error: true,
                        message: "Something went wrong",
                  })
            }
      }
}
