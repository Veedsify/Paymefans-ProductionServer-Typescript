import RateController from "@controllers/RateController"
import express from "express"
const rates = express.Router()

rates.get("/platfrom-rate", RateController.GetPlatformExchangeRate)

export default rates