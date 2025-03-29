import VerificationController from "@controllers/VerificationController"
import Auth from "@middleware/auth"
import express from "express"
const verification = express.Router()

verification.post("/", Auth, VerificationController.ModelVerification)
verification.post("/meta-map", VerificationController.MetaMapVerification)

export default verification
