import AutomatedMessageController from "@controllers/AutomatedMessageController";
import Auth from "@middleware/Auth";
import { validateAutomatedMessageUpdate } from "@middleware/AutomatedMessageValidation";
import express from "express";

const automatedMessages = express.Router();

// Get automated messages
automatedMessages.get("/", Auth, AutomatedMessageController.getAutomatedMessages);

// Update automated messages
automatedMessages.post("/update", Auth, validateAutomatedMessageUpdate, AutomatedMessageController.updateAutomatedMessages);

// Delete specific automated message
automatedMessages.delete("/:messageType", Auth, AutomatedMessageController.deleteAutomatedMessage);

export default automatedMessages;