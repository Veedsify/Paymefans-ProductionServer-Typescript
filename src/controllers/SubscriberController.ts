import SubscriberService from "@services/SubscriberService"
import type { Request, Response } from "express";
import type { AuthUser } from "types/user";

export default class SubscriberController {
    static async CheckSubscriber(req: Request, res: Response): Promise<void> {
        try {
            const checksubscriber = await SubscriberService.CheckSubscriber({ ...req.body });
            if (checksubscriber.error) {
                res.status(400).json({ ...checksubscriber })
            }
            res.status(200).json({ ...checksubscriber })
        } catch (error) {
            console.log(error)
            res.status(500).json({ status: false, error: true, message: "An error occured" })
        }
    }

    static async GetSubscriptionData(req: Request, res: Response): Promise<void> {
        try {
            const getsubscriptiondata = await SubscriberService.GetSubscriptionData(req.params.userId as string);
            if (getsubscriptiondata.error) {
                res.status(400).json({ ...getsubscriptiondata })
            }
            res.status(200).json({ ...getsubscriptiondata })
        } catch (error) {
            console.log(error)
            res.status(500).json({ status: false, error: true, message: "An error occured" })
        }
    }

    static async CreateNewSubscription(req: Request, res: Response): Promise<void> {
        try {
            const options = {
                profileId: req.params.profileId as string,
                tier_id: req.body.tier_id as string,
                user: req.user as AuthUser,
            }
            const createNewSubscription = await SubscriberService.CreateNewSubscription(options);
            if (createNewSubscription.error) {
                res.status(400).json(createNewSubscription)
            }
            res.status(200).json(createNewSubscription)
        } catch (error) {
            console.log(error)
            res.status(500).json({ status: false, error: true, message: "An error occured" })
        }
    }

}
