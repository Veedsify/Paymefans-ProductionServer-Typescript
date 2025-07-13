import express from "express";
import Auth from "@middleware/Auth";
import FollowerController from "@controllers/FollowerController";

const follower = express.Router()

follower.post("/check", Auth, FollowerController.CheckFollower)
follower.post("/all", Auth, FollowerController.GetAllFollowers)
export default follower
