import express from "express"
import AuthController from "../controllers/AuthController.ts"
import auth from "./auth/auth.ts"
const api = express.Router()


// Authentication
api.use("/auth", auth)


export default api
