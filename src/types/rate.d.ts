export type PlatFormConvertionRate = {
    error: boolean;
    message: string;
    data: {
        name: string;
        buyValue: number;
        sellValue: number;
        rate: number;
        symbol: string;
    }[];
}