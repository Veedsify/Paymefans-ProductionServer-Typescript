import jwt from "jsonwebtoken"
import { AuthUser } from "../../types/user";
let { JWT_SECRET, TOKEN_EXPIRATION = '24h' } = process.env;

async function Authenticate(data: AuthUser): Promise<string> {
      return jwt.sign(data, JWT_SECRET as string, { expiresIn: TOKEN_EXPIRATION as string });
};

export default Authenticate
