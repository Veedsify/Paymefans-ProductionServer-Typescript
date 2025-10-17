import query from "@utils/prisma";
import type {
  GetMyNotificationResponse,
  ReadNotificationResponse,
} from "../types/notifications";

interface CreateNotificationData {
  user_id: string;
  message: string;
  action?:
  | "follow"
  | "like"
  | "purchase"
  | "comment"
  | "repost"
  | "message"
  | "live"
  | "sparkle";
  url?: string | null;
}

interface NotificationResult {
  id: number;
  notification_id: string;
  user_id: number;
  message: string;
  action:
    | "follow"
    | "like"
    | "purchase"
    | "comment"
    | "repost"
    | "message"
    | "reply"
    | "live"
    | "sparkle";
  url: string | null;
  read: boolean;
  created_at: Date;
  updated_at: Date;
}

export default class NotificationService {
  // Get My Notifications
  // This function is used to get the notifications of the user
  static async MyNotifications({
    page,
    userId,
  }: {
    page: string;
    userId: number;
  }): Promise<GetMyNotificationResponse> {
    const notificationLoadLimit = 40;
    const notifications = await query.notifications.findMany({
      where: {
        user_id: userId,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: (parseInt(page) - 1) * notificationLoadLimit,
      take: notificationLoadLimit + 1,
    });

    let hasMore = false;
    if (notifications.length > notificationLoadLimit) {
      hasMore = true;
      notifications.pop();
    }

    return {
      error: false,
      hasMore: hasMore,
      data: notifications,
    };
  }
  // Read Notification
  // This function is used to read the notification
  static async ReadNotification(
    id: string,
    userId: number,
  ): Promise<ReadNotificationResponse> {
    try {
      await query.notifications.update({
        where: {
          user_id: Number(userId),
          id: Number(id),
        },
        data: {
          read: true,
        },
      });
      return {
        error: false,
        status: true,
        message: `Update Successful`,
      };
    } catch (error) {
      console.log(error);
      throw new Error("Error updating notification");
    }
  }

  // All Unread Notifications
  // This function is used to get all unread notifications
  static async GetUnreadNotifications(userId: string) {
    const user = await query.user.findFirst({
      where: {
        user_id: userId,
      },
      select: {
        id: true,
      },
    });
    const notifications = await query.notifications.count({
      where: {
        user_id: user?.id,
        read: false,
      },
    });

    return {
      error: false,
      data: notifications,
    };
  }

  // Admin: Create Notification
  // This function is used by admin to create notifications for users
  static async createNotification(
    data: CreateNotificationData,
  ): Promise<NotificationResult> {
    const { user_id, message, action = "message", url = null } = data;

    if (!user_id || !message) {
      throw new Error("user_id and message are required");
    }

    // Find user by user_id string
    const user = await query.user.findFirst({
      where: {
        user_id: user_id,
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    // Create notification
    const notification = await query.notifications.create({
      data: {
        notification_id: require("crypto").randomUUID(),
        user_id: user.id,
        message: message,
        action: action as any,
        url: url || "",
        read: false,
      },
    });

    return notification;
  }

  // Admin: Create Bulk Notifications
  // This function is used by admin to create notifications for multiple users
  static async createBulkNotifications(
    user_ids: string[],
    message: string,
    action:
      | "follow"
      | "like"
      | "purchase"
      | "comment"
      | "repost"
      | "message"
      | "live"
      | "reply"
      | "sparkle" = "message",
    url: string | null = null,
  ): Promise<NotificationResult[]> {
    if (!user_ids || user_ids.length === 0 || !message) {
      throw new Error("user_ids and message are required");
    }

    // Find users by user_id strings
    const users = await query.user.findMany({
      where: {
        user_id: {
          in: user_ids,
        },
      },
      select: {
        id: true,
        user_id: true,
      },
    });

    if (users.length === 0) {
      throw new Error("No users found");
    }

    // Create notifications for all users
    const notifications = await Promise.all(
      users.map((user) =>
        query.notifications.create({
          data: {
            notification_id: require("crypto").randomUUID(),
            user_id: user.id,
            message: message,
            action: action as any,
            url: url || "",
            read: false,
          },
        }),
      ),
    );

    return notifications;
  }

  // Admin: Get All Notifications with pagination
  static async getAllNotifications(
    options: {
      page?: number;
      limit?: number;
      user_id?: string;
      read?: boolean;
    } = {},
  ) {
    const { page = 1, limit = 20, user_id, read } = options;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (user_id) {
      const user = await query.user.findFirst({
        where: { user_id },
        select: { id: true },
      });
      if (user) where.user_id = user.id;
    }

    if (read !== undefined) where.read = read;

    const [notifications, total] = await Promise.all([
      query.notifications.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              user_id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
      }),
      query.notifications.count({ where }),
    ]);

    return {
      notifications,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin: Delete Notification
  static async deleteNotification(notificationId: number): Promise<boolean> {
    const notification = await query.notifications.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    await query.notifications.delete({
      where: { id: notificationId },
    });

    return true;
  }

  // Admin: Mark notification as read/unread
  static async updateNotificationStatus(
    notificationId: number,
    read: boolean,
  ): Promise<NotificationResult> {
    const notification = await query.notifications.findFirst({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new Error("Notification not found");
    }

    const updatedNotification = await query.notifications.update({
      where: { id: notificationId },
      data: { read, updated_at: new Date() },
    });

    return updatedNotification;
  }
}
