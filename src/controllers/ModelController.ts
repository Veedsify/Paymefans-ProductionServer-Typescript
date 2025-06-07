import ModelService from "@services/ModelService"
import type { Request, Response } from "express"
import type { AuthUser } from "types/user"

export default class ModelController {
    static async GetModels(req: Request, res: Response): Promise<any> {
        try {
            const modelssearch = await ModelService.GetModels(req.body)
            if (modelssearch.error) {
                res.status(400).json({ message: modelssearch.message })
                return
            }
            res.status(200).json({ ...modelssearch })
            return
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching models" })
        }
    }

    static async ModelsSearch(req: Request, res: Response): Promise<any> {
        try {
            const modelSearch = await ModelService.ModelsSearch({ searchQuery: req.query as any, user: req.user as AuthUser })
            if (modelSearch.error) {
                res.status(400).json({ message: modelSearch.message })
                return
            }
            res.status(200).json({ ...modelSearch })
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching models" })
        }
    }

    static async GetModelAvailableForHookup(req: Request, res: Response): Promise<any> {
        try {
            const getmodelavailableforhookup = await ModelService.GetModelAvailableForHookup(req.body, req.user as AuthUser)
            if (getmodelavailableforhookup.error) {
                res.status(400).json({ message: getmodelavailableforhookup.message })
                return
            }
            res.status(200).json({ ...getmodelavailableforhookup })
            return
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching models" })
        }
    }

    // static async InitilizeModelPayment(req: Request, res: Response): Promise<any> {
    //     try {
    //         const initilizemodelpayment = await ModelService.InitilizeModelPayment(req.body, req.user as AuthUser)
    //         if (initilizemodelpayment.error) {
    //             res.status(400).json({ message: initilizemodelpayment.message })
    //             return
    //         }
    //         res.status(200).json({ ...initilizemodelpayment })
    //         return
    //     } catch (error) {
    //         console.error(error)
    //         res.status(500).json({ message: "Error initializing model payment" })
    //     }
    // }

    static async SignupModel(req: Request, res: Response): Promise<any> {
        try {
            const signupmodel = await ModelService.SignupModel(req.body, req.user as AuthUser)
            if (signupmodel.error) {
                res.status(400).json({ message: signupmodel.message })
                return
            }
            res.status(200).json({ ...signupmodel })
            return
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error fetching models" })
        }
    }

    static async ValidateModelPayment(req: Request, res: Response): Promise<any> {
        try {
            const validatemodelpayment = await ModelService.ValidateModelPayment({
                reference: req.body.reference,
                status: req.body.status,
                user: req.user as AuthUser,
            })

            if (validatemodelpayment.error) {
                res.status(400).json(validatemodelpayment)
                return
            }
            res.status(200).json({ ...validatemodelpayment })
            return
        } catch (error) {
            console.error(error)
            res.status(500).json({ message: "Error validating model payment" })
        }
    }
}
