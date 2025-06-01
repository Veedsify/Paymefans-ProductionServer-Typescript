import express from "express"
import Auth from "@middleware/auth";
import WalletController from "@controllers/WalletController"
const wallet = express.Router()

wallet.put("/banks/add", Auth, WalletController.AddBank)
wallet.get("/banks", Auth, WalletController.Banks)
wallet.delete("/banks/delete", Auth, WalletController.DeleteBank);
wallet.get("/transactions", Auth, WalletController.GetTransactions);
wallet.get("/transactions/other", Auth, WalletController.OtherTransactions);
wallet.get("/history", Auth, WalletController.History);

export default wallet