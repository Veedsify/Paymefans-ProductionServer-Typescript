type Rate = {
  value: number;
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
  const fromRate = rates.find((rate) => rate.name === fromCurrency)?.value || 1;
  const toRate = rates.find((rate) => rate.name === toCurrency)?.value || 1;

  // Convert from source currency to USD (our base currency)
  return (amount / fromRate) * toRate;
}
