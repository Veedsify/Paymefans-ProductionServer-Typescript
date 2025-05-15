import { Request, Response } from "express";
import WithdrawService from "@services/WithdrawService";
import { AuthUser } from "../types/user";

export default class WithdrawController {

    static async CreateWithdrawRequest(req: Request, res: Response): Promise<any> {
        try {

            const createWithdrawRequest = await WithdrawService.CreateWithdraw({
                userId: req?.user?.id as AuthUser["id"],
                amount: req.body.amount,
            })

            if (createWithdrawRequest.error) {
                return res.status(401).json(createWithdrawRequest)
            }

            return res.status(200).json(createWithdrawRequest)

        } catch (error: any) {
            console.log(error)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }

    // Approve Withdrawal Controller
    static async ApproveWithdrawal(_: Request, res: Response): Promise<any> {
        try {

        } catch (error: any) {
            console.log(error.message)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }

}
