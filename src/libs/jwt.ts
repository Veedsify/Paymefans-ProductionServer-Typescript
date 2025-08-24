import { JsonValue } from "@prisma/client/runtime/library";
import * as jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { redis } from "./RedisStore";
import { durationInSeconds } from "@utils/helpers";
// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-fallback-secret";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || "your-fallback-refresh-secret";
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || "1h";
const REFRESH_TOKEN_EXPIRATION = process.env.REFRESH_TOKEN_EXPIRATION || "7d";
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
}): Promise<{ accessToken: string; refreshToken: string }> {
  const payload = { ...data };
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: TOKEN_EXPIRATION,
  } as SignOptions);

  const refreshToken = jwt.sign(
    { user_id: data.user_id, id: data.id, email: data.email },
    JWT_REFRESH_SECRET,
    {
      expiresIn: REFRESH_TOKEN_EXPIRATION,
    } as SignOptions,
  );
  const key = `refresh_token_${data.id}`;
  redis.set(key, refreshToken, "EX", durationInSeconds(REFRESH_TOKEN_EXPIRATION),);
  return { accessToken, refreshToken };
}
export { Authenticate };
