import { Request, Response } from 'express'
import ProfileService from '../services/ProfileService'
class ProfileController {
      // Load Profile
      static async Profile(req: Request, res: Response): Promise<any> {
            try {
                  const body = req.body
                  const user = await ProfileService.Profile(body.username)
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
}

export default ProfileController
