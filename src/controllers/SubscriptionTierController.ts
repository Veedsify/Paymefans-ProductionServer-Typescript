import SubscriptionTierService from "@services/SubscriptionTiers";
import { Request, Response } from "express";
import { AuthUser } from "types/user";


export default class SubscriptionTierController {
    static async CreateSubscriptionTier(req: Request, res: Response): Promise<any> {
        try {
            const createSubscriptionTier = await SubscriptionTierService.CreateSubscriptionTier({
                tiers: req.body.tiers,
                user: req.user as unknown as AuthUser
            });
            if (createSubscriptionTier.error) {
                return res.status(400).json({ error: true, message: createSubscriptionTier.message });
            }
            return res.status(200).json({ error: false, message: createSubscriptionTier.message });
        } catch (error) {
            console.error("Error creating subscription tier:", error);
            return res.status(500).json({ error: true, message: "Internal server error" });
        }
    }
    // Fetch user subscription tiers
    static async FetchUserSubscription(req: Request, res: Response): Promise<any> {
        try {
            const subscription_tiers = await SubscriptionTierService.UserSubscriptions(req.user?.id!, req.params.user_id)

            if (subscription_tiers.error) {
                return res.status(400).json({
                    message: subscription_tiers.message,
                    status: 'error'
                })
            }

            return res.status(200).json({
                message: 'Subscription Tier Retrieved Successfully',
                data: subscription_tiers.data,
                status: 'success'
            })
        }
        catch (err: any) {
            console.error(err)
            return res.status(500).json({
                message: 'Internal Server Error',
                status: 'error'
            })
        }
    }
}
