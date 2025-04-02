import { Request, Response } from "express";
import NotificationService from "@services/NotificationService";

export default class NotificationController {
      // Get My Notifications
      // This function is used to get the notifications of the user
      static async GetMyNotifications(req: Request, res: Response): Promise<void> {
            try {
                  const notifications = await NotificationService.MyNotifications({ page: req.params.page, userId: req.user!.id as number })
                  if (notifications.error) {
                        res.status(401).json(notifications)
                  }
                  res.status(200).json(notifications)
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
                        res.status(401).json(notification)
                  }
                  res.status(200).json(notification)
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
