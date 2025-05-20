import type { Request, Response } from 'express'
import ProfileService from '@services/ProfileService'

class ProfileController {
    // Load Profile
    static async Profile(req: Request, res: Response): Promise<any> {
        try {
            const body = req.body
            const authUserId = req.user?.id as number
            const username = body.username as string
            const user = await ProfileService.Profile(username, authUserId)
            res.json(user)
        } catch (error) {
            console.error('Profile error:', error)
            res.status(500).json({ error: 'Error fetching profile' })
        }
    }

    //Banner Change
    static async BannerChange(req: Request, res: Response): Promise<any> {
        try {
            const user = await ProfileService.BannerChange(req)
            res.json(user)
        } catch (error) {
            console.error('Banner error:', error)
            res.status(500).json({ error: 'Error changing banner' })
        }
    }

    //Avatar Change
    static async ProfileUpdate(req: Request, res: Response): Promise<any> {
        try {
            const user = await ProfileService.ProfileUpdate(req)
            res.json(user)
        } catch (error) {
            console.error('Avatar error:', error)
            res.status(500).json({ error: 'Error changing avatar' })
        }
    }

    // Profile Stats
    static async ProfileStats(req: Request, res: Response): Promise<any> {
        try {
            const stats = await ProfileService.ProfileStats({
                user: req.user!,
                type: req.params.type as 'followers' | 'subscribers' | 'following',
                limit: Number(req.query.limit) as number,
                cursor: Number(req.query.cursor as string) as number,
                query: String(req.query.query),
            })

            if (stats.error) {
                return res.status(400).json(stats)
            }

            res.status(200).json(stats)
        } catch (error: any) {
            console.log('Profile stats error:', error)
            res.status(500).json({
                error: true,
                message: error.message,
            })
        }
    }

    // Follow/Unfollow User
    static async FollowUnfollowUser(req: Request, res: Response): Promise<any> {
        try {
            const user = await ProfileService.FollowUnfollowUser(
                req.user!.id,
                req.params.action as 'follow' | 'unfollow',
                Number(req.params.userId) as number,
            )
            res.status(200).json(user)
        } catch (error) {
            console.error('Follow/Unfollow error:', error)
            res.status(500).json({ error: 'Error following/unfollowing user' })
        }
    }
}

export default ProfileController
