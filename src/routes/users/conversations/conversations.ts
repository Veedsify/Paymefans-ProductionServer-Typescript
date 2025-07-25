import express from "express";
import Auth from "@middleware/Auth";
import ConversationController from "@controllers/ConversationController";
import { CreateUpload } from "@middleware/FileUploadConfig";
const conversations = express.Router();

const attachments = CreateUpload("attachments");

conversations.get(
  "/my-conversations",
  Auth,
  ConversationController.MyConversations
);
conversations.get(
  "/messages/:conversationId",
  Auth,
  ConversationController.AllConversations
);
conversations.get(
  "/receiver/:conversationId",
  Auth,
  ConversationController.ConversationReceiver
);
conversations.post(
  "/create-new",
  Auth,
  ConversationController.CreateConversation
);
conversations.post(
  "/upload/attachments",
  attachments.fields([{ name: "attachments[]", maxCount: 20 }]),
  ConversationController.UploadAttachments
);
conversations.get("/search/", Auth, ConversationController.SearchConversations);
conversations.post(
  "/search/messages/:conversationId",
  Auth,
  ConversationController.SearchMessages
);
conversations.get("/unread-count", Auth, ConversationController.GetUnreadCount);
export default conversations;
