export interface ModelsSearchResponse {
      error: boolean;
      message: string;
      status?: boolean
      models: Models[]
}

export interface GetModelsResponse {
      error: boolean;
      message: string;
      status?: boolean
      models: Models[]
}
export interface GetModelAvailableForHookupResponse {
      error: boolean;
      message: string;
      status?: boolean
      hookups: Hookups[]
}
export interface SignupModelResponse {
      error: boolean;
      message: string;
      status?: boolean
}
export interface ValidateModelPaymentResponse {
      error: boolean;
      message: string;
      status?: boolean
}

export interface Models extends Omit<User, "password"> { }
export interface Hookups extends Omit<User, "password"> extends Settings { }

export interface ModelsSearchProps {
      limit: string;
      q: string;
      page: string;
}
export interface GetModelAvailableForHookupProps {
      limit: string;
}
export interface SignupModelProps {
      available: string;
      country: string;
      lastname: string;
      firstname: string;
      dob: string;
      gender: string;
      audience: string;
}
export interface CreateStreamProps {
      id: string;
      name: string;
      username: string;
      image: string | null;
}
export interface ValidateModelPaymentProps {
      reference: string;
      trxref: string;
 }
