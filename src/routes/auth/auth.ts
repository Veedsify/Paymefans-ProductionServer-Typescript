import express from "express"
import AuthController from "@controllers/AuthController"
import Auth from "@middleware/auth"
const auth = express.Router()


// Authentication
auth.post("/signup", AuthController.Register)
auth.post("/signup/username", AuthController.Username)
auth.post("/login", AuthController.Login);

auth.post("/points", Auth, AuthController.Points);
auth.post("/wallet", Auth, AuthController.Wallet);
auth.get("/retrieve", Auth, AuthController.Retrieve);

export default auth
