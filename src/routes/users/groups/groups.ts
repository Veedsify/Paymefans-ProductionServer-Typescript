import express from "express";
import Auth from "@middleware/Auth";
import GroupController from "@controllers/GroupController";
import { CreateUpload } from "@middleware/FileUploadConfig";

const groups = express.Router();

// Configure file upload middleware for group attachments
const groupAttachments = CreateUpload("group-attachments");

// Group management routes
groups.post("/create", Auth, GroupController.createGroup);
groups.get("/my-groups", Auth, GroupController.getUserGroups);
groups.get("/search", Auth, GroupController.searchGroups);
groups.get("/stats", Auth, GroupController.getUserGroupStats);

// Individual group routes
groups.get("/:groupId", Auth, GroupController.getGroupById);
groups.put("/:groupId", Auth, GroupController.updateGroup);
groups.delete("/:groupId", Auth, GroupController.deleteGroup);
groups.put("/:groupId/settings", Auth, GroupController.updateGroupSettings);

// Group membership routes
groups.post("/:groupId/join", Auth, GroupController.joinGroup);
groups.post("/:groupId/leave", Auth, GroupController.leaveGroup);
groups.post("/:groupId/invite", Auth, GroupController.inviteToGroup);
groups.get("/:groupId/members", Auth, GroupController.getGroupMembers);
groups.put(
  "/:groupId/members/:memberId/role",
  Auth,
  GroupController.updateMemberRole,
);
groups.delete(
  "/:groupId/members/:memberId",
  Auth,
  GroupController.removeMember,
);

// Group messaging routes
groups.get("/:groupId/messages", Auth, GroupController.getGroupMessages);
groups.post(
  "/:groupId/messages",
  groupAttachments.array("attachments", 10),
  Auth,
  GroupController.sendMessage,
);

// Join request management routes
groups.get("/:groupId/join-requests", Auth, GroupController.getJoinRequests);
groups.post(
  "/join-requests/:requestId/approve",
  Auth,
  GroupController.approveJoinRequest,
);
groups.post(
  "/join-requests/:requestId/reject",
  Auth,
  GroupController.rejectJoinRequest,
);

// Invitation management routes
groups.get("/invitations/received", Auth, GroupController.getUserInvitations);
groups.post(
  "/invitations/:invitationId/accept",
  Auth,
  GroupController.acceptInvitation,
);
groups.post(
  "/invitations/:invitationId/decline",
  Auth,
  GroupController.declineInvitation,
);

export default groups;
