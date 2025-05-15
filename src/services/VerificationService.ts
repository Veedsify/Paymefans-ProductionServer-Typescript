import query from "@utils/prisma";
import type { AuthUser } from "types/user";
import type { StartModelVerificationResponse } from "types/verification";
import EmailService from "./EmailService";

export default class VerificationService {
  static async StartModelVerificationService({
    user,
  }: {
    user: AuthUser;
  }): Promise<StartModelVerificationResponse> {
    const { id } = user;
    try {
      return await query.$transaction(async (tx) => {
        const checkIfStarted = await tx.model.findFirst({
          where: {
            user_id: id,
            verification_state: "started",
          },
        });

        if (checkIfStarted) {
          return {
            error: false,
            message: "Verification already started",
            token: checkIfStarted.token,
          };
        }

        await tx.model.update({
          where: {
            user_id: id,
          },
          data: {
            verification_state: "started",
          },
        });

        const model = await tx.model.findFirst({
          where: {
            user_id: id,
          },
          select: {
            token: true,
          },
        });

        // Send Model Verification Email
        await EmailService.ModelWelcomeEmail(user.name, user.email);
        return {
          error: false,
          message: "Verification started",
          token: model?.token as string,
        };
      });
    } catch (error: any) {
      return { error: true, message: error.message, token: null };
    }
  }

  // VerifyTokenService
  // This function verifies the token before processing the verification.
  static async VerifyTokenService({ token }: { token: string }): Promise<{
    error: boolean;
    message: string;
  }> {
    try {
      if (!token) {
        return {
          error: true,
          message: "Token not provided",
        };
      }

      const model = await query.model.findFirst({
        where: {
          token: token,
          verification_status: false,
          NOT: {
            verification_state: "approved",
          },
        },
        select: {
          id: true,
        },
      });

      if (!model || !model.id) {
        return {
          error: true,
          message: "Token not found",
        };
      }

      return {
        error: false,
        message: "Token verified",
      };
    } catch (error: any) {
      return { error: true, message: error.message };
    }
  }
}
