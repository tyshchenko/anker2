import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { MarketData } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";

interface ChartPanelProps {
  currentPair: string;
}

const timeframes = [
  { label: "1H", value: "1h", active: true },
  { label: "1D", value: "1d" },
  { label: "1W", value: "1w" },
  { label: "1M", value: "1m" },
  { label: "1Y", value: "1y" },
];

export function ChartPanel({ currentPair }: ChartPanelProps) {
  const { data: marketData = [], isLoading } = useQuery<MarketData[]>({
    queryKey: ["/api/market", currentPair],
    refetchInterval: 5000,
  });

  const chartData = useMemo(() => {
    return marketData.map((data, index) => ({
      time: new Date(data.timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      price: parseFloat(data.price),
      index,
    }));
  }, [marketData]);

  const currentPrice = chartData.length > 0 ? chartData[chartData.length - 1].price : 0;
  const firstPrice = chartData.length > 0 ? chartData[0].price : 0;
  const priceChange = currentPrice - firstPrice;
  const percentChange = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  const formatPrice = (price: number) => {
    if (currentPair.includes("ZAR")) {
      return `R${price.toLocaleString()}`;
    }
    return price.toLocaleString();
  };

  if (isLoading) {
    return (
      <section className="flex-1 p-6">
        <div className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading chart data...</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="flex-1 p-6">
      <div className="h-full flex flex-col space-y-6">
        {/* Price Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Trading Pair</div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-current-pair">
              {currentPair}
            </h1>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold font-mono" data-testid="text-current-price">
              {formatPrice(currentPrice)}
            </div>
            <div 
              className={`text-lg ${percentChange >= 0 ? "price-up" : "price-down"}`}
              data-testid="text-price-change"
            >
              {percentChange >= 0 ? "+" : ""}{formatPrice(priceChange)} ({percentChange.toFixed(2)}%) today
            </div>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 min-h-[400px] bg-card rounded-xl border border-border p-4 chart-container">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(204, 76%, 49%)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsl(204, 76%, 49%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeOpacity={0.08} vertical={false} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false} 
                  minTickGap={32} 
                />
                <YAxis 
                  tick={{ fill: "hsl(215, 20%, 65%)", fontSize: 12 }} 
                  tickLine={false} 
                  axisLine={false} 
                  width={70} 
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(value) => formatPrice(value)}
                />
                <Tooltip
                  contentStyle={{ 
                    background: "hsl(222, 84%, 5%)", 
                    border: "1px solid hsl(217, 32%, 17%)", 
                    borderRadius: 12, 
                    color: "hsl(210, 40%, 98%)" 
                  }}
                  labelStyle={{ color: "hsl(215, 20%, 65%)" }}
                  formatter={(value: number) => [formatPrice(value), "Price"]}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="hsl(204, 76%, 49%)" 
                  fill="url(#priceGradient)" 
                  strokeWidth={2} 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                </svg>
                <p className="text-muted-foreground">No chart data available</p>
              </div>
            </div>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {timeframes.map((timeframe) => (
              <Button
                key={timeframe.value}
                variant={timeframe.active ? "default" : "ghost"}
                size="sm"
                className="px-3 py-1.5 text-sm"
                data-testid={`button-timeframe-${timeframe.value}`}
              >
                {timeframe.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" data-testid="button-fullscreen">
            <Expand className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
        </div>
      </div>
    </section>
  );
}
