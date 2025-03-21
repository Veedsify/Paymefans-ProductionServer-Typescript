import {AuthUser} from "types/user"
import {
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
} from "../types/models"

const apiKey = process.env.GETSTREAM_API_KEY as string
const secret = process.env.GETSTREAM_API_SECRET as string
import {StreamClient} from "@stream-io/node-sdk"

const client = new StreamClient(apiKey, secret, {timeout: 6000});
import query from "@utils/prisma";
import {GenerateUniqueId} from "@utils/GenerateUniqueId";

export default class ModelService {
    static async GetModels(body: ModelsSearchProps, user: AuthUser): Promise<GetModelsResponse> {
        const {limit} = body;
        try {
            const result = await query.$transaction(async (tx) => {
                const models: Models = await tx.$queryRaw`
                    SELECT *
                    FROM User
                             INNER JOIN Model ON User.id = Model.user_id
                    WHERE User.is_model = true
                      AND User.id != ${user.id}
                      AND Model.verification_status = true
                    ORDER BY RAND()
                        LIMIT ${limit};
                `;

                const modelsWithoutPassword = models.map(({password, ...rest}: { password: string }) => rest);

                return {
                    error: false,
                    message: "Successfully fetched models",
                    models: modelsWithoutPassword,
                };
            });

            return result;
        } catch (error) {
            console.error(error);
            return {
                error: true,
                message: "Error fetching models",
                models: [],
            };
        }
    }

    static async ModelsSearch({searchQuery, user}: {
        searchQuery: ModelsSearchProps;
        user: AuthUser
    }): Promise<ModelsSearchResponse> {
        const {page, limit, q} = searchQuery
        console.log(q, limit, page)
        // Parse limit to an integer or default to 5 if not provided
        const parsedLimit = limit ? parseInt(limit, 10) : 6;
        const validLimit = Number.isNaN(parsedLimit) || parsedLimit <= 0 ? 5 : parsedLimit;

        // Parse page to an integer or default to 1 if not provided
        const parsedPage = page ? parseInt(page, 10) : 1;
        const validPage = Number.isNaN(parsedPage) || parsedPage <= 0 ? 1 : parsedPage;
        try {
            const getmodels = await query.user.findMany({
                where: {
                    is_model: true,
                    Model: {
                        verification_status: true,
                    },
                    NOT: [
                        {
                            id: user.id
                        }
                    ],
                    OR: [
                        {
                            fullname: {
                                contains: q,
                            }
                        },
                        {
                            username: {
                                contains: q,
                            }
                        },
                    ]
                },
                select: {
                    profile_image: true,
                    username: true,
                    id: true,
                    fullname: true,
                    Subscribers: {
                        select: {
                            id: true,
                            subscriber_id: true
                        }
                    }
                },
                orderBy: {
                    created_at: "desc"
                },
                skip: (validPage - 1) * validLimit,
                take: validLimit,
            })

            return {
                models: getmodels,
                error: false,
                status: true,
                message: "Model search successful"
            }
        } catch (error) {
            console.log(error)
            return {
                models: [],
                error: true,
                status: false,
                message: "Error fetching models"
            }
        }
    }

    static async GetModelAvailableForHookup(body: GetModelAvailableForHookupProps, user: AuthUser): Promise<GetModelAvailableForHookupResponse> {
        const {limit} = body;
        try {
            const models: Hookups = await query.user.findMany({
                where: {
                    Model: {
                        verification_status: true,
                        hookup: true
                    },
                    NOT: {
                        id: user.id
                    }
                },
                take: Number(limit),
                select: {
                    id: true,
                    username: true,
                    fullname: true,
                    profile_image: true,
                    profile_banner: true,
                    is_model: true,
                    Settings: {
                        select: {
                            price_per_message: true,
                            subscription_price: true,
                        }
                    },
                    Model: {
                        select: {
                            hookup: true,
                        }
                    }
                },
                orderBy: {
                    id: "desc"
                },
            });
            const modelsWithoutPassword = models.map(({password, ...rest}: { password: string }) => rest);
            return {
                error: false,
                message: "Successfully fetched hookups",
                hookups: modelsWithoutPassword,
            }
        } catch (err) {
            return {
                error: true,
                message: "Error fetching hookups",
                hookups: [],
            }
        }
    }

    static async SignupModel(body: SignupModelProps, user: AuthUser): Promise<SignupModelResponse> {
        try {
            const {
                firstname,
                lastname,
                dob,
                country,
                available,
                gender,
            } = body

            const checkUserIsModel = await query.model.findFirst({
                where: {
                    user_id: user?.id
                }
            })

            if (checkUserIsModel) {
                return {
                    error: true,
                    status: false,
                    message: `You are already signed up as a model`
                }
            }

            let dateOfBirth = new Date(dob);
            let currentDate = new Date();

            if (dateOfBirth >= currentDate) {
                return {
                    error: true,
                    status: false,
                    message: "Invalid date of birth"
                }
            }

            if ((currentDate.getFullYear() - dateOfBirth.getFullYear()) < 18) {
                return {
                    error: true,
                    status: false,
                    message: "You must be 18 years and above to sign up as a model"
                }
            }

            const referenceId = `MDL${GenerateUniqueId()}`;

            let signUpUserAsModel = await query.model.create({
                data: {
                    user_id: user.id,
                    firstname,
                    lastname,
                    dob: new Date(dob),
                    gender: gender,
                    country,
                    hookup: available === "yes",
                    verification_status: false,
                    token: referenceId
                }
            });

            await query.user.update({
                where: {
                    id: user.id
                },
                data: {
                    is_model: true,
                }
            })

            if (!signUpUserAsModel) {
                return {
                    error: true,
                    status: false,
                    message: "An error occurred while signing you up"
                }
            }

            const getUser = await query.user.findUnique({
                where: {
                    id: user.id
                },
                select: {
                    username: true,
                    name: true,
                    user_id: true,
                    profile_image: true,
                    Model: true,
                    Settings: true
                }
            });

            try {
                // Create A Stream Id
                if (getUser) {
                    await this.CreateStreamUser({
                        id: getUser?.user_id,
                        username: getUser.username,
                        name: getUser.name,
                        image: getUser.profile_image
                    });
                }
            } catch (e) {
                console.log(`Error creating stream user: ${e}`);
            }

            query.$disconnect();
            return {message: "You have been signed up as a model", status: true, error: false}

        } catch (e) {
            console.log(e)
            return {message: "An error occurred while signing you up", status: false, error: true}
        }
    }

    // Create Stream User
    static async CreateStreamUser({id, name, username, image}: CreateStreamProps) {
        const newUser = {
            id: id,
            role: 'user',
            custom: {
                username: username,
            },
            name: name,
            image: process.env.SERVER_ORIGINAL_URL as string + image,
        };
        await client.upsertUsers({
            users: {
                [newUser.id]: newUser,
            },
        });
        return {newUser, create: true};
    }

    // static async ValidateModelPayment(queryParams: ValidateModelPaymentProps): Promise<ValidateModelPaymentResponse> {
    //       try {
    //             const { reference } = queryParams;
    //             const getUserWithRef = await query.model.findFirst({
    //                   where: {
    //                         payment_reference: reference
    //                   },
    //                   select: {
    //                         user_id: true
    //                   }
    //             });
    //             if (!getUserWithRef.user_id) {
    //                   return {
    //                         status: false,
    //                         error: true,
    //                         message: `Invalid reference`
    //                   }
    //             }
    //             const updateUserAsModel = await query.model.update({
    //                   where: {
    //                         user_id: getUserWithRef.user_id
    //                   },
    //                   data: {
    //                         verification_status: true
    //                   }
    //             });

    //             if (updateUserAsModel) {
    //                   await query.user.update({
    //                         where: {
    //                               id: getUserWithRef.user_id
    //                         },
    //                         data: {
    //                               is_model: true
    //                         }
    //                   })

    //                   query.$disconnect();
    //             }
    //             return {
    //                   status: true,
    //                   error: false,
    //                   message: `Payment validated successfully`
    //             }
    //       } catch (err) {
    //             console.log(err)
    //             return {
    //                   status: false,
    //                   error: true,
    //                   message: `An error occurred while validating payment`
    //             }
    //       }
    // }
}
