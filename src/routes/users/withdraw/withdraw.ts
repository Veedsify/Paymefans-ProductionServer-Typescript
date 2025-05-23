import express from "express"
import WithdrawController from "@controllers/WithdrawController";
import Auth from "@middleware/auth";

const withdraw = express.Router()

withdraw.post("/request-withdraw", Auth, WithdrawController.CreateWithdrawRequest)
withdraw.post("/withdrawl-pin/verify", Auth, WithdrawController.VerifyWithdrawPin)
withdraw.post("/withdrawl-pin/create", Auth, WithdrawController.CreateWithdrawPin)
withdraw.post("/withdraw/confirm", Auth, WithdrawController.ConfirmWithdraw)

export default withdraw