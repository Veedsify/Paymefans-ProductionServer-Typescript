import PointController from "@controllers/PointController"
import Auth from "@middleware/auth"
import express from "express"
const point = express.Router()

point.post("/get-points", Auth, PointController.GetUserPoints)


export default point
