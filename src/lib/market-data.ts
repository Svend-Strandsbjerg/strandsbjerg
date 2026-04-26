export type MarketSecurityLookup = {
  isin: string;
  securityName?: string | null;
  currency?: string | null;
};

export type MarketSecurityResult = {
  isin: string;
  symbol?: string;
  name?: string;
  currency?: string;
  provider: string;
};

export type LatestMarketPrice = {
  isin: string;
  price: number;
  currency: string;
  asOf: Date;
  provider: string;
};

export interface MarketDataProvider {
  readonly providerName: string;
  resolveSecurity(input: MarketSecurityLookup): Promise<MarketSecurityResult | null>;
  getLatestPrice(isin: string): Promise<LatestMarketPrice | null>;
}

class UnconfiguredMarketDataProvider implements MarketDataProvider {
  readonly providerName = "UNCONFIGURED";

  async resolveSecurity(input: MarketSecurityLookup): Promise<MarketSecurityResult | null> {
    return {
      isin: input.isin,
      name: input.securityName ?? undefined,
      currency: input.currency ?? undefined,
      provider: this.providerName,
    };
  }

  async getLatestPrice(): Promise<LatestMarketPrice | null> {
    return null;
  }
}

export class MarketDataService {
  constructor(private readonly provider: MarketDataProvider) {}

  resolveSecurity(input: MarketSecurityLookup) {
    return this.provider.resolveSecurity(input);
  }

  getLatestPrice(isin: string) {
    return this.provider.getLatestPrice(isin);
  }

  getProviderName() {
    return this.provider.providerName;
  }
}

export function createMarketDataService() {
  return new MarketDataService(new UnconfiguredMarketDataProvider());
}
