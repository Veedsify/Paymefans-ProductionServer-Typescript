import express from "express"
import WithdrawController from "@controllers/WithdrawController";
import Auth from "@middleware/auth";

const withdraw = express.Router()


withdraw.post("/request-withdraw", Auth, WithdrawController.CreateWithdrawRequest)

export default withdraw