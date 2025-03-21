import {Request, Response} from "express";
import FollowerService from "@services/FollowerService";
import { AuthUser } from "types/user";

export default class FollowerController {
    // Check Follower
    static async CheckFollower(req: Request, res: Response): Promise<any> {
        try {
            const checkFollower = await FollowerService.CheckFollower(req.body)
            if (checkFollower.error) {
                res.status(400).json({...checkFollower})
            }
            res.status(200).json({...checkFollower})
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }
    // Get All Followers
    static async GetAllFollowers(req: Request, res: Response): Promise<any> {
        try {
            const getAllFollowers = await FollowerService.GetAllFollowers({query: req.query as any, user: req?.user as AuthUser})
            if (getAllFollowers.error) {
                res.status(400).json({...getAllFollowers})
            }
            res.status(200).json({...getAllFollowers})
        } catch (err: any) {
            res.status(500).json({message: err.message})
        }
    }
}
