import ReferralController from "@controllers/ReferralController"
import Auth from "@middleware/Auth"
import express from "express"
const referral = express.Router()

// Get referral statistics
referral.get("/stats", Auth, ReferralController.getReferralStats)

// Get referred users (paginated)
referral.get("/users", Auth, ReferralController.getReferredUsers)

// Get referral earnings (paginated)
referral.get("/earnings", Auth, ReferralController.getReferralEarnings)

// Create a new referral
referral.post("/create", Auth, ReferralController.createReferral)

// Validate referral code
referral.get("/validate", ReferralController.validateReferralCode)

// Add referral earnings (admin function)
referral.post("/add-earnings", Auth, ReferralController.addReferralEarnings)

export default referral
