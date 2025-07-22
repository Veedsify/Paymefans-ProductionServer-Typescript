import NotificationController from "@controllers/NotificationController"
import Auth from "@middleware/Auth"
import express from "express"
const notifications = express.Router()

// Get unread notifications count (must be before /:page to avoid conflicts)
notifications.get("/unread-count", Auth, NotificationController.GetUnreadCount)

// Get notifications with pagination
notifications.get("/:page", Auth, NotificationController.GetMyNotifications)

// Mark notification as read
notifications.put("/read/:id", Auth, NotificationController.ReadNotification)

export default notifications
