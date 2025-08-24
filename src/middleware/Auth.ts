import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/user";
import { serialize } from "cookie";
export default async function Auth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<any> {
  try {
    // Get token from Authorization header (Bearer <token>)
    const authHeader = req.headers.authorization;
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : undefined;
    // Fallback to token in cookie if not in header
    if (!token && req.cookies?.token) {
      token = req.cookies.token;
    }
    if (!token) {
      return res
        .setHeader("Set-Cookie", [
          serialize("token", "", {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
          }),
          serialize("refresh_token", "", {
            httpOnly: process.env.NODE_ENV === "production",
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            expires: new Date(0),
          })
        ])
        .status(401)
        .json({ message: "No token found", status: false });
    }
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined in the environment variables");
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthUser;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: "Unauthorized", status: false });
  }
}