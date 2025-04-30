import EmailController from "@controllers/EmailController";
import { Router } from "express";
const email = Router();


email.post("/custom-email", EmailController.SendCustomEmail)

export default email;
