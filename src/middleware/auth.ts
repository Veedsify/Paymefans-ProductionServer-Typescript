import type { NextFunction, Request } from "express";
import type { Response } from "express";
import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/user";

export default async function Auth(req: Request, res: Response, next: NextFunction): Promise<any> {
    try {
        if (!req.headers) {
            return res
                .status(400)
                .json({ message: "Authorization token is missing", status: false });
        }

        const token = req.headers.authorization?.split(" ")[1];

        if (!token) {
            return res.status(400).json({ message: "No token found", status: false });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in the environment variables");
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as AuthUser
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(400).json({ message: "Unauthorized", status: false });
    }
};
