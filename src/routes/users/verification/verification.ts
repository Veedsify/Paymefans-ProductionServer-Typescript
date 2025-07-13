import VerificationController from "@controllers/VerificationController"
import Auth from "@middleware/Auth"
import express from "express"
import { CreateUpload } from "@middleware/FileUploadConfig";

const verification = express.Router()

const verificationUpload = CreateUpload("verification")

verification.post("/", Auth, VerificationController.ModelVerification)
verification.post("/meta-map", VerificationController.MetaMapVerification)
verification.post("/process/:token", verificationUpload.fields([
    { name: 'front' },
    { name: 'back' },
    { name: 'faceVideo' }
]), VerificationController.ProcessVerification)
verification.post("/verify-token", VerificationController.VerifyToken)
verification.get("/status/:token", VerificationController.CheckVerificationStatus)
verification.get("/debug/queue", VerificationController.DebugQueueStatus)
verification.post("/debug/manual/:token", VerificationController.ManualVerificationTrigger)


export default verification