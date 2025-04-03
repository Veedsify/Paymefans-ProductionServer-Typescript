import SubscriberService from "@services/SubscriberService"
import {Request, Response} from "express";
import {AuthUser} from "types/user";

export default class SubscriberController {
    static async CheckSubscriber(req: Request, res: Response): Promise<void> {
        try {
            const checksubscriber = await SubscriberService.CheckSubscriber({...req.body});
            if (checksubscriber.error) {
                res.status(401).json({...checksubscriber})
            }
            res.status(200).json({...checksubscriber})
        } catch (error) {
            console.log(error)
            res.status(500).json({status: false, error: true, message: "An error occured"})
        }
    }

    static async GetSubscriptionData(req: Request, res: Response): Promise<void> {
        try {
            const getsubscriptiondata = await SubscriberService.GetSubscriptionData(req.params.userId);
            if (getsubscriptiondata.error) {
                res.status(401).json({...getsubscriptiondata})
            }
            res.status(200).json({...getsubscriptiondata})
        } catch (error) {
            console.log(error)
            res.status(500).json({status: false, error: true, message: "An error occured"})
        }
    }

    static async CreateNewSubscription(req: Request, res: Response): Promise<void> {
        try {
            const options = {
                profileId: req.params.profileId,
                tier_id: req.body.tier_id,
                user: req.user as AuthUser,
            }
            const createNewSubscription = await SubscriberService.CreateNewSubscription(options);
            if (createNewSubscription.error) {
                res.status(401).json(createNewSubscription)
            }
            res.status(200).json(createNewSubscription)
        } catch (error) {
            console.log(error)
            res.status(500).json({status: false, error: true, message: "An error occured"})
        }
    }

}
