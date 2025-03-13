// src/types/express.d.ts
import {AuthUser} from "./user"; // Import your user type

declare global {
    namespace Express {
        interface Request {
            user?: AuthUser;
        }
    }
}

export {};
