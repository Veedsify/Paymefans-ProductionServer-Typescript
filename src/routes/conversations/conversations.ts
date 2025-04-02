import express from "express"
import Auth from "@middleware/auth";
import ConversationController from "@controllers/ConversationController";
import { CreateUpload } from "@middleware/FileUploadConfig";
const conversations = express.Router()

const attachments = CreateUpload("attachments")

conversations.get("/my-conversations", Auth, ConversationController.MyConversations)
conversations.get("/messages/:conversationId", Auth, ConversationController.AllConversations)
conversations.post("/create-new", Auth, ConversationController.CreateConversation)
conversations.post("/upload/attachments", attachments.single("file"), ConversationController.UploadAttachments)
conversations.get("/search/", Auth, ConversationController.SearchConversations)
conversations.post("/search/messages/:conversationId", Auth, ConversationController.SearchMessages)
export default conversations
