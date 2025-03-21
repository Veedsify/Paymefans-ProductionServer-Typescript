import PointController from "@controllers/PointController"
import Auth from "@middleware/auth"
import express from "express"
const point = express.Router()

point.post("/get-points", Auth, PointController.GetUserPoints)
point.post("/buy", Auth, PointController.BuyPoints)
point.post("/rate", Auth, PointController.ConversionRate)
point.post("/purchase", Auth, PointController.PurchasePoints)
point.post("/callback", PointController.PaymentCallBack)
point.get("/callback", PointController.PaymentCallBack)
point.get("/global", PointController.GetGlobalPoints)
point.post("/price-per-message", Auth, PointController.PricePerMessage)
export default point
