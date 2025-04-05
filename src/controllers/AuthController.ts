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
                console.log(CreateAccount.message)
                return res.status(201).json({ message: CreateAccount.message, status: false });
            }

            return res.status(201).json({ message: "Account created successfully", status: true });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error", status: false });
        }
    }

    //  Username Checker
    static async Username(req: Request, res: Response): Promise<any> {
        const CheckForUsername = await UsernameService.CheckUsername({
            username: req.body.username
        });

        if (!CheckForUsername.status) {
            return res.status(401).json({ message: CheckForUsername.message, status: false });
        }

        return res.status(200).json({ message: CheckForUsername.message, status: true });
    }

    // Login Service
    static async Login(req: Request, res: Response): Promise<any> {
        try {
            const LoginAccount = await LoginService.LoginUser(req.body);

            if (LoginAccount.error) {
                console.log(LoginAccount.message)
                return res.status(401).json({ message: LoginAccount.message, status: false });
            }

            return res.status(200).json({ message: "Login successful", status: true, token: LoginAccount.token, user: LoginAccount.user });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error", status: false });
        }
    }

    // Points
    static async Points(req: Request, res: Response): Promise<any> {
        try {
            const points = await PointService.RetrievePoints(req?.user?.id as number);
            return res.status(200).json({ points: points.points, status: true });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error", status: false });
        }
    }

    // Retrieve Wallet
    static async Wallet(req: Request, res: Response): Promise<any> {
        try {
            const UserWallet = await WalletService.RetrieveWallet(req?.user?.id as number);
            return res.status(200).json({ balance: UserWallet.wallet, status: true });
        } catch (error) {
            return res.status(500).json({ message: "Internal server error", status: false });
        }
    }

    // Retrieve User
    static async Retrieve(req: Request, res: Response): Promise<any> {
        const user = await UserService.RetrieveUser(req?.user?.id as number)
        return res.status(200).json(user);
    }
}
