import express from "express";
import Auth from "@middleware/Auth";
import BlockController from "@controllers/BlockController";

const block = express.Router();

// Block a user
block.post("/block-user", Auth, BlockController.BlockUser);

// Unblock a user
block.post("/unblock-user", Auth, BlockController.UnblockUser);

// Check if user is blocked
block.post("/check-status", Auth, BlockController.CheckBlockStatus);

// Check if current user is blocked by another user
block.post("/check-blocked-by", Auth, BlockController.CheckIfBlockedBy);

// Get all blocked users
block.get("/blocked-users", Auth, BlockController.GetBlockedUsers);

export default block;
