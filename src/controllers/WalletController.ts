import type {Request, Response} from "express"
import WalletService from "@services/WalletService";
import type {AuthUser} from "../types/user";

export default class WalletController {
    // Add Bank
    static async AddBank(req: Request, res: Response): Promise<void> {
        try {
            const addBank = await WalletService.AddBank(req.body, req.user as AuthUser)
            if (addBank.error) {
                res.status(401).send({...addBank})
            }
            res.status(200).send({...addBank})
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }

    // Get Banks
    static async Banks(req: Request, res: Response): Promise<void> {
        try {
            const getBanks = await WalletService.GetBanks(req.user as AuthUser)
            if (getBanks.error) {
                res.status(401).send({...getBanks})
            }
            res.status(200).send(getBanks)
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }

    // Delete Bank
    static async DeleteBank(req: Request, res: Response): Promise<void> {
        try {
            const deleteBank = await WalletService.DeleteBank(req.body, req.user as AuthUser)
            if (!deleteBank.status) {
                res.status(401).send({...deleteBank})
            }
            res.status(200).send(deleteBank)
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }

//     Transactions
    static async GetTransactions(req: Request, res: Response): Promise<void> {
        try {
            const getTransactions = await WalletService.GetTransactions(req.user as AuthUser)
            if (getTransactions.error) {
                res.status(401).send({...getTransactions})
            }
            res.status(200).send(getTransactions)
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }

    //OtherTransactions
    static async OtherTransactions(req: Request, res: Response): Promise<void> {
        try {
            const getTransactions = await WalletService.OtherTransactions(req.user as AuthUser)
            if (getTransactions.error) {
                res.status(401).send({...getTransactions})
            }
            res.status(200).send(getTransactions)
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }
}
