import { User } from "@prisma/client";
import { AuthUser } from "./user";
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}
