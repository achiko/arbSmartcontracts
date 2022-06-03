export interface IARBITEM {
  ProfitCurrency: string;
  token2Decimals: string;
  Profit: number;
  ProfitCurrencyName: string;
  token1Decimals: string;
  Path: PATHITEM[];
}

export interface PATHITEM {
  router: string;
  swapFrom: string;
  poolAddress: string;
  nameFrom: string;
  swapTo: string;
  nameTo: string;
  swapAmountFrom: number;
  swapAmountTo?: number;
}
