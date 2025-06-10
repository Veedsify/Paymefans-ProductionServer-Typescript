import RegisterService from "@services/RegisterService";
import type { Request, Response } from "express";
import UsernameService from "@services/UsernameService";
import LoginService from "@services/LoginService";
import PointService from "@services/PointService";
import WalletService from "@services/WalletService";
import UserService from "@services/UserService";

export default class AuthController {
  // Register Service
  static async Register(req: Request, res: Response): Promise<any> {
    try {
      const CreateAccount = await RegisterService.RegisterNewUser(req.body);

      if (CreateAccount.error) {
        console.log(CreateAccount.message);
        return res
          .status(201)
          .json({ message: CreateAccount.message, status: false });
      }

      return res
        .status(201)
        .json(CreateAccount);
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  static async ValidateRegistration(req: Request, res: Response): Promise<any> {
    try {
      const ValidateAccount = await RegisterService.ValidateRegistration({
        email: req.body.email,
        phone: req.body.phone,
      });
      if (!ValidateAccount.status) {
        return res.status(400).json(ValidateAccount);
      }

      return res.status(200).json({
        message: "Account verified successfully",
        status: true,
      });

    } catch (error) {
      console.log(error);
      res.status(500).json({
        message: "Internal server error",
        status: false,
      })
    }
  }

  //  Username Checker
  static async Username(req: Request, res: Response): Promise<any> {
    const CheckForUsername = await UsernameService.CheckUsername({
      username: req.body.username,
    });

    if (!CheckForUsername.status) {
      console.log(CheckForUsername);
      return res.status(400).json(CheckForUsername);
    }

    return res.status(200).json(CheckForUsername);
  }

  // Login Service
  static async Login(req: Request, res: Response): Promise<any> {
    try {
      const LoginAccount = await LoginService.LoginUser(req.body);
      return res.status(200).json(LoginAccount);
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  // Points
  static async Points(req: Request, res: Response): Promise<any> {
    try {
      const points = await PointService.RetrievePoints(req?.user?.id as number);
      return res.status(200).json({ points: points.points, status: true });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  // Retrieve Wallet
  static async Wallet(req: Request, res: Response): Promise<any> {
    try {
      const UserWallet = await WalletService.RetrieveWallet(
        req?.user?.id as number,
      );
      return res.status(200).json({ balance: UserWallet.wallet, status: true });
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  // Retrieve User
  static async Retrieve(req: Request, res: Response): Promise<any> {
    try {
      const user = await UserService.RetrieveUser(req?.user?.id as number);
      if (!user.status) {
        return res.status(400).json(user);
      }
      return res.status(200).json(user);
    } catch (error: any) {
      console.log(error.message);
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  // Two Factor Authentication
  static async TwoFactorAuth(req: Request, res: Response): Promise<any> {
    try {
      const { two_factor_auth } = req.body;
      const user = await UserService.UpdateTwoFactorAuth(
        req?.user?.id as number,
        two_factor_auth,
      );

      if (user.error) {
        return res.status(400).json(user);
      }

      return res.status(200).json(user);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }

  // Verify Two Factor Authentication
  static async VerifyTwoFactorAuth(req: Request, res: Response): Promise<any> {
    try {
      const { code } = req.body;
      const user = await UserService.VerifyTwoFactorAuth(code);

      if (user.error) {
        return res.status(400).json(user);
      }

      return res.status(200).json(user);
    } catch (error) {
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }
}
