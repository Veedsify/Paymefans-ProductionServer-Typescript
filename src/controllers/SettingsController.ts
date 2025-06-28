import type { Request, Response } from "express";
import SettingsService from "@services/SettingsService";
import type { AuthUser } from "types/user";
export default class SettingsController {
  static async SettingsProfileChange(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      const profileChange = await SettingsService.SettingsProfileChange(
        req.body,
        req.user?.id!,
      );
      if (profileChange.error) {
        res
          .status(201)
          .json({ status: false, error: true, message: profileChange.message });
        return;
      }
      return res
        .status(200)
        .json({ status: true, error: false, message: profileChange.message });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }
  static async HookupStatusChange(req: Request, res: Response): Promise<any> {
    try {
      const hookupStatus = await SettingsService.HookupStatusChange(
        req.body,
        req.user!,
      );
      if (hookupStatus.error) {
        res.status(201).json({ ...hookupStatus });
        return;
      }
      return res.status(200).json({ ...hookupStatus });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }
  static async ChangePassword(req: Request, res: Response): Promise<any> {
    try {
      const changePassword = await SettingsService.ChangePassword(
        req.body,
        req.user!,
      );
      if (changePassword.error) {
        res
          .status(201)
          .json({
            message: changePassword.message,
            error: true,
            status: false,
          });
        return;
      }
      return res
        .status(200)
        .json({ message: changePassword.message, error: false, status: true });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }
  static async SetMessagePrice(req: Request, res: Response): Promise<any> {
    try {
      const setMessagePrice = await SettingsService.SetMessagePrice(
        req.body,
        req.user as AuthUser,
      );
      if (setMessagePrice.error) {
        res.status(201).json({ ...setMessagePrice });
        return;
      }
      return res.status(200).json({ ...setMessagePrice });
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }
  // Check Username Before Change
  static async CheckUserName(req: Request, res: Response): Promise<any> {
    try {
      const checkUsernameAvailability = await SettingsService.CheckUserName(
        req.query.username as string,
        req.user as AuthUser,
      );
      if (checkUsernameAvailability?.error) {
        res.status(400).json(checkUsernameAvailability);
        return;
      }
      return res.status(200).json(checkUsernameAvailability);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }

  // Update Show Active Status
  static async UpdateShowActiveStatus(
    req: Request,
    res: Response,
  ): Promise<any> {
    try {
      const { show_active } = req.body;
      const updateResult = await SettingsService.UpdateShowActiveStatus(
        show_active,
        req.user as AuthUser,
      );

      if (updateResult.error) {
        res.status(400).json(updateResult);
        return;
      }

      return res.status(200).json(updateResult);
    } catch (error: any) {
      console.log(error.message);
      res.status(500).json({ message: "Internal Server error" });
    }
  }
}
