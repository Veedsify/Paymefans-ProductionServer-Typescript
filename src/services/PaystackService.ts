import { bankTypes } from "../types/withdraw";

export class PaystackService {
  static async InitializePayment(data: {
    email: string;
    amount: number;
    currency: string;
    reference: string;
    callback_url: string;
    metadata?: any;
  }): Promise<any> {
    try {
      const { email, amount, currency, callback_url, reference, metadata } =
        data;
      const response = await fetch(
        "https://api.paystack.co/transaction/initialize",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            amount,
            currency: currency,
            callback_url,
            reference,
            ...(metadata && { metadata }),
          }),
        },
      );

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("Error initializing payment");
    }
  }

  // Create Customer
  static async CreateCustomer(data: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
  }): Promise<any> {
    try {
      const { email, first_name, last_name, phone } = data;
      const response = await fetch("https://api.paystack.co/customer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          first_name,
          last_name,
          phone,
        }),
      });

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("Error creating customer");
    }
  }

  // Resolve Bank Account
  static async ResolveBankAccount(data: {
    account_number: string;
    bank_code: string;
  }): Promise<any> {
    try {
      const { account_number, bank_code } = data;
      const response = await fetch("https://api.paystack.co/bank/resolve", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          account_number,
          bank_code,
        }),
      });

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("Error resolving bank account");
    }
  }

  // Link The Bank Account
  static async TransferRecipient(data: {
    account_number: string;
    bank_code: string;
    name: string;
    type: bankTypes;
    currency: "NGN";
  }): Promise<any> {
    try {
      const { account_number, bank_code, name, type, currency } = data;
      const response = await fetch(
        "https://api.paystack.co/transferrecipient",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            type: type,
            name: name,
            account_number,
            bank_code,
            currency,
          }),
        },
      );

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("Error linking bank account");
    }
  }

  // Initiate Transfer
  static async InitiateTransfer(data: {
    amount: number;
    recipient_code: string;
    reason: string;
  }): Promise<any> {
    try {
      const { amount, recipient_code, reason } = data;
      const response = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount,
          recipient: recipient_code,
          reason,
        }),
      });

      const responseData = await response.json();
      return responseData;
    } catch (error) {
      console.error(error);
      throw new Error("Error initiating transfer");
    }
  }

  // Validate Payment
  // This function is used to validate a payment.
  static async ValidatePayment(
    reference: string,
  ): Promise<{ error: boolean; message: string }> {
    try {
      const response = await fetch(
        `https://api.paystack.co/transaction/verify/${reference}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      const responseData = await response.json();
      return {
        error: responseData?.data?.status == "success" ? false : true,
        message: responseData?.message,
      };
    } catch (error) {
      console.error(error);
      throw new Error("Error validating payment");
    }
  }
}
