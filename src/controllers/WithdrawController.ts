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
                return res.status(400).json(createWithdrawRequest)
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

    // Verify Withdrawal Pin Controller
    static async VerifyWithdrawPin(req: Request, res: Response): Promise<any> {
        try {
            const { pin } = req.body

            const verifyPin = await WithdrawService.VerifyWithdrawPin({
                user: req?.user as AuthUser,
                pin,
            })

            if (verifyPin.error) {
                return res.status(400).json(verifyPin)
            }

            return res.status(200).json(verifyPin)

        } catch (error: any) {
            console.log(error.message)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }

    // Create Withdrawal Pin Controller
    static async CreateWithdrawPin(req: Request, res: Response): Promise<any> {
        try {
            const { pin } = req.body

            const createPin = await WithdrawService.CreateWithdrawPin({
                user: req?.user as AuthUser,
                pin,
            })

            if (createPin.error) {
                return res.status(400).json(createPin)
            }

            return res.status(200).json(createPin)

        } catch (error: any) {
            console.log(error.message)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }

    // Withdraw Confirmation Controller
    static async ConfirmWithdraw(req: Request, res: Response): Promise<any> {
        try {

            // const { userId, pin, amount, bankId } = req.body
            console.log(req.body)

            return res.status(200).json({
                message: "Withdraw request created successfully",
                data: req.body,
            })

        } catch (error: any) {
            console.log(error.message)
            return res.status(500).json({ error: "Internal Server Error" })
        }
    }
}
