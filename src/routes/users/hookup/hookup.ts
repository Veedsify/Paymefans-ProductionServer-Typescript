import HookupController from "@controllers/HookupController";
import Auth from "@middleware/Auth";
import express from "express";

const router = express.Router();

// Update user location
router.post("/location", Auth, HookupController.updateLocation);

// Get nearby hookups
router.get("/nearby", Auth, HookupController.getNearbyHookups);

export default router;