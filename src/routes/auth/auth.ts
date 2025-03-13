import express from "express"
import AuthController from "../../controllers/AuthController.ts"
const auth = express.Router()


// Authentication
auth.post("/auth/signup", AuthController.Register)
auth.post("/auth/signup/username", AuthController.Username)
auth.post("/auth/login", AuthController.Login);

export default auth
