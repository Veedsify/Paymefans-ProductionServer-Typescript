import { JsonValue } from "@prisma/client/runtime/library";
import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret";
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1h";

async function Authenticate(data: {
  id: number;
  active_status: boolean;
  email: string;
  username: string;
  user_id: string;
  name: string;
  should_delete: boolean;
  flags: JsonValue;
  Settings: {
    two_factor_auth: boolean;
  } | null;
}): Promise<any> {
  const payload = { ...data };
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  } as SignOptions);
}

export { Authenticate };
