type Rate = {
  buyValue: number;
  sellValue: number;
  symbol: string;
  name: string;
  rate: number;
};

// Convert local currency amount to target currency
export default async function convertCurrency(
  rates: Rate[],
  amount: number,
  fromCurrency: string,
  toCurrency: string,
): Promise<number> {
  if (fromCurrency === "POINTS") {
    // Convert points to USD first (16 points = $1)
    const usdAmount =
      amount /
      (rates.find((rate: Rate) => rate.name === "POINTS")?.buyValue ||
        16);

    // Then convert USD to target currency
    const targetRate =
      rates.find((rate: Rate) => rate.name === toCurrency)
        ?.buyValue || 1;

    return usdAmount * targetRate;
  }

  // For other currency conversions
  if (fromCurrency === "USD") {
    // Direct conversion from USD
    const toRate =
      rates.find((rate: Rate) => rate.name === toCurrency)
        ?.buyValue || 1;
    return amount * toRate;
  } else if (toCurrency === "USD") {
    // Convert to USD
    const fromRate =
      rates.find((rate: Rate) => rate.name === fromCurrency)
        ?.buyValue || 1;
    return amount / fromRate;
  } else {
    // Convert through USD as intermediate
    const fromRate =
      rates.find((rate: Rate) => rate.name === fromCurrency)
        ?.buyValue || 1;
    const toRate =
      rates.find((rate: Rate) => rate.name === toCurrency)
        ?.buyValue || 1;

    // First convert to USD then to target currency
    const usdAmount = amount / fromRate;
    return usdAmount * toRate;
  }
}
