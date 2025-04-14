export type SettingsProfileChangeResponse = {
      error: boolean;
      message: string;
}
export type HookupStatusChangeResponse = {
      error: boolean;
      message: string;
}
export type ChangePasswordResponse = {
      error: boolean;
      message: string;
      status?: boolean;
}
export type SetMessagePriceResponse = {
      error: boolean;
      message: string;
      status?: boolean
}


export interface SettingProfileProps {
      name: string;
      location: string;
      bio: string;
      website: string;
      email: string;
      username: string;
}

export interface ChangePassWordProps {
      oldPassword: string;
      newPassword: string;
}

export interface HookUpStatusProps {
      hookup: boolean
}

export interface SetMessagePriceProps {
      price_per_message: string;
      enable_free_message: boolean;
      subscription_price: string;
      subscription_duration: string;
}
export interface CheckUserNameResponse {
      status: boolean;
      error: boolean;
      username: string;
      message: string;
}