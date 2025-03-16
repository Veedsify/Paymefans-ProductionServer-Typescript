import { LoginUserProps, LoginUserResponse } from '../types/auth';
import ComparePasswordHash from '@libs/ComparePassordHash';
import { Authenticate } from '@libs/jwt';
import query from '@utils/prisma';
export default class LoginService {
      // Login User
      static async LoginUser(data: LoginUserProps): Promise<LoginUserResponse> {
            try {
                  if (!data) return { error: true, message: "Invalid request" };
                  const { email, password: pass } = data;


                  if (!email || !pass) {
                        return { error: true, message: "Email and password are required" };
                  }

                  const user = await query.user.findFirst({
                        where: {
                              email: email,
                        },
                  });

                  if (!user) {
                        return { error: true, message: "Invalid email or password" };
                  }

                  const match = await ComparePasswordHash(pass, user.password);

                  if (!match) {
                        return { error: true, message: "Invalid email or password" };
                  }

                  const { password, ...rest } = user;
                  const token = await Authenticate(rest);
                  return { token, error: false, message: "Login Successful", user: rest };
            }
            catch (error) {
                  return { error: true, message: "Internal server error" };
            }
      }


}
