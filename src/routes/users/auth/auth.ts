import express from "express";
import AuthController from "@controllers/AuthController";
import Auth from "@middleware/Auth";
import LogOutController from "@controllers/LogoutController";
import Paths from "@utils/paths";
const auth = express.Router();

// Authentication
auth.post(Paths.API.Auth.Points, Auth, AuthController.Points);
auth.post(Paths.API.Auth.Wallet, Auth, AuthController.Wallet);
auth.get(Paths.API.Auth.Retrieve, Auth, AuthController.Retrieve);
auth.post(Paths.API.Auth.Signup, AuthController.Register);
auth.post(
    Paths.API.Auth.SignUpValidateRegistrationDetails,
    AuthController.ValidateRegistration,
);
auth.post(Paths.API.Auth.SignUpUsername, AuthController.Username);
auth.post(Paths.API.Auth.Login, AuthController.Login);
auth.post(
    Paths.API.Auth.TwoFactorAuthentication,
    Auth,
    AuthController.TwoFactorAuth,
);
auth.post(
    Paths.API.Auth.VerifyTwoFactorAuth,
    AuthController.VerifyTwoFactorAuth,
);
auth.post(
    Paths.API.Auth.ResendTwoFactorCode,
    AuthController.ResendTwoFactorCode,
);
auth.post(
    Paths.API.Auth.VerifyEmailRegistration,
    AuthController.VerifyEmailRegistration,
);
auth.post(
    Paths.API.Auth.ResendEmailVerificationCode,
    AuthController.ResendEmailVerificationCode,
);
auth.post(Paths.API.Auth.Logout, LogOutController.Logout);
auth.post(Paths.API.Auth.TokenRefresh, AuthController.RefreshToken);

export default auth;
