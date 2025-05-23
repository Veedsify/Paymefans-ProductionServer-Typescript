import type { AuthUser } from "types/user";
import type {
  ModelsSearchResponse,
  GetModelAvailableForHookupResponse,
  SignupModelResponse,
  // ValidateModelPaymentResponse,
  ModelsSearchProps,
  GetModelAvailableForHookupProps,
  SignupModelProps,
  // ValidateModelPaymentProps,
  Models,
  GetModelsResponse,
  Hookups,
  CreateStreamProps,
  ValidateModelPaymentProps,
  ValidateModelPaymentResponse,
} from "../types/models";

const apiKey = process.env.GETSTREAM_API_KEY as string;
const secret = process.env.GETSTREAM_API_SECRET as string;
import { StreamClient } from "@stream-io/node-sdk";

const client = new StreamClient(apiKey, secret, { timeout: 6000 });
import query from "@utils/prisma";
import { GenerateUniqueId } from "@utils/GenerateUniqueId";
import { redis } from "@libs/RedisStore";
import { PaystackService } from "./PaystackService";

export default class ModelService {
  static async GetModels(
    body: { limit: number },
  ): Promise<GetModelsResponse> {
    const { limit } = body;
    try {
      const models = await redis.get(`models`);
      if (!models) {
        return await query.$transaction(async (tx) => {
          const models: Models = await tx.$queryRaw`
                        SELECT * FROM "User"
                        INNER JOIN "Model" ON "User"."id" = "Model"."user_id"
                        WHERE "User"."is_model" = true
                        AND "Model"."verification_status" = true
                        ORDER BY RANDOM()
                        LIMIT ${limit};
                    `;

          const modelsWithoutPassword = models.map(
            ({ password, ...rest }: { password: string }) => rest,
          );
          const options = {
            error: false,
            message: "Successfully fetched models",
            models: modelsWithoutPassword,
          };

          // Save to redis
          await redis.set(`models`, JSON.stringify(options), "EX", 60); // 10 minutes
          return options;
        });
      }

      return JSON.parse(models);
    } catch (error) {
      console.error(error);
      return {
        error: true,
        message: "Error fetching models",
        models: [],
      };
    }
  }

  static async ModelsSearch({
    searchQuery,
    user,
  }: {
    searchQuery: ModelsSearchProps;
    user: AuthUser;
  }): Promise<ModelsSearchResponse> {
    const { page, limit, q } = searchQuery;
    console.log(q, limit, page);
    // Parse limit to an integer or default to 5 if not provided
    const parsedLimit = limit ? parseInt(limit, 10) : 6;
    const validLimit =
      Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

    // Parse page to an integer or default to 1 if not provided
    const parsedPage = page ? parseInt(page, 10) : 1;
    const validPage =
      Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
    try {
      const getmodels = await query.user.findMany({
        where: {
          is_model: true,
          Model: {
            verification_status: true,
          },
          NOT: [
            {
              id: user.id,
            },
          ],
          OR: [
            {
              fullname: {
                contains: q,
              },
            },
            {
              username: {
                contains: q,
              },
            },
          ],
        },
        select: {
          profile_image: true,
          username: true,
          id: true,
          fullname: true,
          Subscribers: {
            select: {
              id: true,
              subscriber_id: true,
            },
          },
        },
        orderBy: {
          created_at: "desc",
        },
        skip: (validPage - 1) * validLimit,
        take: validLimit,
      });

      return {
        models: getmodels,
        error: false,
        status: true,
        message: "Model search successful",
      };
    } catch (error) {
      console.log(error);
      return {
        models: [],
        error: true,
        status: false,
        message: "Error fetching models",
      };
    }
  }

  static async GetModelAvailableForHookup(
    body: GetModelAvailableForHookupProps,
    user: AuthUser,
  ): Promise<GetModelAvailableForHookupResponse> {
    const { limit } = body;
    try {
      const hookups = await redis.get(`hookups`);
      if (!hookups) {
        // Parse limit to an integer or default to 5 if not provided
        const parsedLimit = limit ? parseInt(limit, 10) : 6;
        const validLimit =
          Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;
        const models: Hookups = await query.$queryRaw`
                    SELECT User.id,
                           User.username,
                           User.fullname,
                           User.profile_image,
                           User.profile_banner,
                           User.is_model,
                           Settings.price_per_message,
                           Settings.subscription_price,
                           Model.hookup
                    FROM User
                             INNER JOIN Model ON User.id = Model.user_id
                             LEFT JOIN Settings ON User.id = Settings.user_id
                    WHERE Model.verification_status = true
                      AND Model.hookup = true
                      AND User.id != ${user.id}
                    ORDER BY RAND()
                        LIMIT ${validLimit};
                `;

        const modelsWithoutPassword = models.map(
          ({ password, ...rest }: { password: string }) => rest,
        );
        const options = {
          error: false,
          message: "Successfully fetched hookups",
          hookups: modelsWithoutPassword,
        };

        // Save to redis
        await redis.set(
          `hookups`,
          JSON.stringify(options),
          "EX",
          1000 * 60 * 10,
        ); // 10 minutes
        return options;
      }

      return JSON.parse(hookups);
    } catch (err) {
      return {
        error: true,
        message: "Error fetching hookups",
        hookups: [],
      };
    }
  }

  static async SignupModel(
    body: SignupModelProps,
    user: AuthUser,
  ): Promise<SignupModelResponse> {
    try {
      const { firstname, lastname, dob, country, available, gender } = body;

      const checkUserIsModel = await query.model.findFirst({
        where: {
          user_id: user?.id,
        },
      });

      if (checkUserIsModel) {
        return {
          error: true,
          status: false,
          errorTitle: "Already a model",
          message: `You are already signed up as a model`,
        };
      }

      let dateOfBirth = new Date(dob);
      let currentDate = new Date();

      if (dateOfBirth >= currentDate) {
        return {
          error: true,
          errorTitle: "Invalid date of birth",
          status: false,
          message: "Invalid date of birth",
        };
      }

      if (currentDate.getFullYear() - dateOfBirth.getFullYear() < 18) {
        return {
          error: true,
          status: false,
          errorTitle: "Age restriction",
          message: "You must be 18 years and above to sign up as a model",
        };
      }

      const referenceId = `MDL${GenerateUniqueId()}`;

      let signUpUserAsModel = await query.model.create({
        data: {
          user_id: user.id,
          firstname,
          lastname,
          dob: new Date(dob),
          gender: String(gender).toLowerCase(),
          country,
          hookup: available === "yes",
          verification_status: false,
          token: referenceId,
        },
      });

      await query.user.update({
        where: {
          id: user.id,
        },
        data: {
          is_model: true,
        },
      });

      if (!signUpUserAsModel) {
        return {
          error: true,
          errorTitle: "Error signing up",
          status: false,
          message: "An error occurred while signing you up",
        };
      }

      query.$disconnect();
      return {
        errorTitle: "You are now a model",
        message: "You have been signed up as a model",
        status: true,
        error: false,
      };
    } catch (e) {
      console.log(e);
      return {
        errorTitle: "Error signing up",
        message: "An error occurred while signing you up",
        status: false,
        error: true,
      };
    }
  }

  // Create Stream User
  static async CreateStreamUser({
    id,
    name,
    username,
    image,
  }: CreateStreamProps) {
    const newUser = {
      id: id,
      role: "user",
      custom: {
        username: username,
      },
      name: name,
      image: (process.env.SERVER_ORIGINAL_URL as string) + image,
    };
    await client.upsertUsers({
      users: {
        [newUser.id]: newUser,
      },
    });
    return { newUser, create: true };
  }

  static async ValidateModelPayment(data: ValidateModelPaymentProps): Promise<ValidateModelPaymentResponse> {
    try {
      const { reference } = data;

      const verifyPayment = await PaystackService.ValidatePayment(reference)

      if (verifyPayment.error) {
        return {
          error: true,
          status: false,
          message: verifyPayment.message,
          errorTitle: "Payment verification failed",
        };
      }

      return {
        error: false,
        status: true,
        message: "Payment verification successful",
      }

    } catch (err) {
      console.log(err);
      throw new Error("Error validating model payment");
    }
  }
}
