import query from "@utils/prisma";
import { GetMyNotificationResponse, ReadNotificationResponse } from "../types/notifications";

export default class NotificationService {
    // Get My Notifications
    // This function is used to get the notifications of the user    
    static async MyNotifications({ page, userId }: { page: string, userId: number }): Promise<GetMyNotificationResponse> {
        const notificationLoadLimit = 40
        const notifications = await query.notifications.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                created_at: "desc"
            },
            skip: ((parseInt(page) - 1) * notificationLoadLimit),
            take: notificationLoadLimit + 1
        })

        let hasMore = false;
        if (notifications.length > notificationLoadLimit) {
            hasMore = true;
            notifications.pop()
        }

        await query.$disconnect()

        return {
            error: false,
            hasMore: hasMore,
            data: notifications
        }

    }
    catch(err: any) {
        console.log(err);
        throw new Error(err)
    }
    // Read Notification
    // This function is used to read the notification
    static async ReadNotification(id: string, userId: number): Promise<ReadNotificationResponse> {
        try {
            await query.notifications.update({
                where: {
                    user_id: Number(userId),
                    id: Number(id),
                },
                data: {
                    read: true
                }
            })
            await query.$disconnect()
            return {
                error: false,
                status: true,
                message: `Update Successful`
            }
        } catch (error) {
            console.log(error);
            await query.$disconnect()
            throw new Error("Error updating notification")
        }
    }
}
