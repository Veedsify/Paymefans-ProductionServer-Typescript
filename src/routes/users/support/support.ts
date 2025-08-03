import Auth from "@middleware/Auth";
import SupportController from "@controllers/SupportController";
import express from "express";

const support = express.Router();

// Create a new support ticket
support.post("/tickets", Auth, SupportController.CreateSupportTicket);

// Get user's support tickets
support.get("/tickets", Auth, SupportController.GetUserSupportTickets);

// Get a specific support ticket
support.get("/tickets/:ticketId", Auth, SupportController.GetSupportTicket);

// Reply to a support ticket
support.post("/tickets/:ticketId/reply", Auth, SupportController.ReplySupportTicket);

// Close a support ticket
support.patch("/tickets/:ticketId/close", Auth, SupportController.CloseSupportTicket);

export default support;