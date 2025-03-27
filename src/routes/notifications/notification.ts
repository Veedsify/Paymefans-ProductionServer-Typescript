import NotificationController from "@controllers/NotificationController"
import Auth from "@middleware/auth"
import express from "express"
const notifications = express.Router()

notifications.post("/:page", Auth, NotificationController.GetMyNotifications)
notifications.get("/read/:id", Auth, NotificationController.ReadNotification)
export default notifications
