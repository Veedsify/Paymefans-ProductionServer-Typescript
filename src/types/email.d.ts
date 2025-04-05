export type EmailServiceProp = {
      email: string;
      subject: string;
      message: string;
}
export type EmailServiceResponse = {
      message: any
      error: boolean;
}

export interface SendEmailServiceProp {
      email: string;
      subject: string;
      name: string;
      points: number;
      transactionId: string;
}


export interface SendEmailResponse {
      message: string;
      error: boolean;
}
