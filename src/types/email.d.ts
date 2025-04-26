export type EmailServiceProp = {
  email: string;
  name: string;
  subject: string;
  message: string;
};
export type EmailServiceResponse = {
  message: any;
  error: boolean;
};

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

export interface SendNewMessageEmailProps {
  email: string;
  name: string;
  subject: string;
  link: string;
}

export type Product = {
  name: string;
  price: string;
  orderid: string;
  date: string;
};
