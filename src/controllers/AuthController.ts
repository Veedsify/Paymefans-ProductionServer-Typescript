import RegisterService from "@services/RegisterService";
import type { Request, Response } from "express";
import UsernameService from "@services/UsernameService";
import LoginService from "@services/LoginService";
import PointService from "@services/PointService";
import WalletService from "@services/WalletService";
import UserService from "@services/UserService";
import * as jwt from "jsonwebtoken";
import { serialize } from "cookie";
import { Authenticate } from "@libs/jwt";
import { redis } from "@libs/RedisStore";
import { durationInSeconds } from "@utils/helpers";
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || "7d";

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

      return res.status(201).json(CreateAccount);
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
      });
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
      if (LoginAccount.error) {
        return res.status(400).json(LoginAccount);
      }

      if (LoginAccount.token) {
        res.setHeader(
          "Set-Cookie",
          [serialize("token", LoginAccount.token as string, {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 3600,
          }),
          serialize("refresh_token", LoginAccount.refresh as string, {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          })]
        );
      }

      res.status(200).json(LoginAccount);
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

  // Refresh Token
  static async RefreshToken(req: Request, res: Response): Promise<any> {
    try {
      const client_refresh_token = req.cookies?.refresh_token;

      if (!client_refresh_token) {
        return res
          .status(401)
          .json({ message: "No token found", status: false });
      }

      const decoded = jwt.verify(
        client_refresh_token,
        process.env.JWT_REFRESH_SECRET as string) as {
          user_id: string;
          id: number;
          email: string;
        }

      if (!decoded || (decoded && !decoded?.email)) {
        return res
          .status(401)
          .json({ message: "Invalid request, please login again", status: false });
      }

      const user = await UserService.GetUserJwtPayload(decoded?.email)

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid user, please login again", status: false });
      }

      const key = `refresh_token_${user.id}`;
      const token = await redis.get(key);

      if (!token || token !== client_refresh_token) {
        return res
          .status(401)
          .json({ message: "Invalid token, please login again", status: false });
      }

      const { accessToken, refreshToken } = await Authenticate(user);

      if (!accessToken || !refreshToken) {
        return res
          .status(401)
          .json({ message: "Invalid token, please login again", status: false });
      }

      redis.set(key, refreshToken, "EX", durationInSeconds(REFRESH_TOKEN_EXPIRATION));
      res.setHeader(
        "Set-Cookie",
        [
          serialize("token", accessToken as string, {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          }),
          serialize("refresh_token", refreshToken as string, {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
          }),
        ]
      );

      return res.status(200).json({
        token: accessToken,
        refresh: refreshToken,
        message: "Token refreshed successfully",
      });
    } catch (error) {
      console.log(error);
      return res
        .status(500)
        .json({ message: "Internal server error", status: false });
    }
  }
}
