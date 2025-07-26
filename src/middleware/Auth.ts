import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/user";

export async function Auth(
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
      return res.status(403).json({ message: "No token found", status: false });
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


// Export the Auth function as default as well for backward compatibility
export default Auth