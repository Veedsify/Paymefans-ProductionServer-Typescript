import type { User } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-fallback-secret';
const TOKEN_EXPIRATION = process.env.TOKEN_EXPIRATION || '1h';

async function Authenticate(data: Omit<User, "password">): Promise<any> {
  const payload = { ...data };
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: TOKEN_EXPIRATION } as SignOptions
  );
}

export { Authenticate };
