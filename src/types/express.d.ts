import { User } from "@prisma/client";
import { AuthUser } from "./user";
import {Config} from "./config";
declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
            config?: Config;
        }
    }
}
