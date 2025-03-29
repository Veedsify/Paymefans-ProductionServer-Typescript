import query from "@utils/prisma";
import { AuthUser } from "types/user";
import { StartModelVerificationResponse } from "types/verification";

export default class VerificationService {
  static async Startmodelverificationservice({
    user,
  }: {
    user: AuthUser;
  }): Promise<StartModelVerificationResponse> {
    const { id } = user;
    try {
      const result = await query.$transaction(async (tx) => {
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
          }
        });

        return {
          error: false,
          message: "Verification started",
          token: model?.token as string,
        };
      });

      return result;
    } catch (error: any) {
      return { error: true, message: error.message, token: null };
    }
  }
}
