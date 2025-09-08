import { useQuery } from "@tanstack/react-query";
import type { MarketData } from "@shared/schema";

export function MarketTicker() {
  const { data: marketData = [] } = useQuery<MarketData[]>({
    queryKey: ["/api/market"],
    refetchInterval: 5000,
  });

  const formatPrice = (price: string, pair: string) => {
    const numPrice = parseFloat(price);
    if (pair.includes("ZAR")) {
      return `R${numPrice.toLocaleString()}`;
    }
    return numPrice.toLocaleString();
  };

  const formatChange = (change: string | null) => {
    if (!change) return "0.00%";
    const numChange = parseFloat(change);
    return `${numChange >= 0 ? "+" : ""}${numChange.toFixed(2)}%`;
  };

  return (
    <div className="bg-muted border-b border-border overflow-hidden">
      <div className="ticker-scroll flex space-x-8 py-2 px-4 whitespace-nowrap">
        {marketData.map((data) => (
          <div key={data.pair} className="flex items-center space-x-2" data-testid={`ticker-${data.pair}`}>
            <span className="text-sm font-medium" data-testid={`text-pair-${data.pair}`}>
              {data.pair}
            </span>
            <span className="text-sm font-mono" data-testid={`text-price-${data.pair}`}>
              {formatPrice(data.price, data.pair)}
            </span>
            <span 
              className={`text-xs ${
                parseFloat(data.change24h || "0") >= 0 ? "price-up" : "price-down"
              }`}
              data-testid={`text-change-${data.pair}`}
            >
              {formatChange(data.change24h)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
