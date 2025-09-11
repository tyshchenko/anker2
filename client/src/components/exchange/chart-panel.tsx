import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType } from 'lightweight-charts';
import { Button } from "@/components/ui/button";
import { Expand } from "lucide-react";

interface ChartPanelProps {
  currentPair: string;
}

interface OHLCVData {
  timestamp: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

const timeframes = [
  { label: "1H", value: "1H" },
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },

];

export function ChartPanel({ currentPair }: ChartPanelProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");

  // Parse the current pair to extract CRYPTO and FIAT (e.g., "BTC/ZAR" -> ["BTC", "ZAR"])
  const [crypto, fiat] = currentPair.split('/');

  const { data: ohlcvData = [], isLoading } = useQuery<OHLCVData[]>({
    queryKey: ["/api/market", crypto, fiat, selectedTimeframe, "OHLCV"],
    queryFn: async () => {
      const response = await fetch(`/api/market/${crypto}/${fiat}?timeframe=${selectedTimeframe}&type=OHLCV`);
      if (!response.ok) throw new Error('Failed to fetch OHLCV data');
      return response.json();
    },
    refetchInterval: 30000, // Reduced frequency for chart data
    enabled: !!(crypto && fiat), // Only fetch if we have both crypto and fiat
  });

  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);

  const candlestickData = useMemo(() => {
    return ohlcvData.map((data) => {
      const timestamp = Math.floor(new Date(data.timestamp).getTime() / 1000); // Convert to seconds for lightweight-charts
      return {
        time: timestamp as any,
        open: parseFloat(data.open),
        high: parseFloat(data.high),
        low: parseFloat(data.low),
        close: parseFloat(data.close),
      };
    }).sort((a, b) => (a.time as number) - (b.time as number)); // Ensure chronological order
  }, [ohlcvData]);

  const currentPrice = candlestickData.length > 0 ? candlestickData[candlestickData.length - 1].close : 0;
  const firstPrice = candlestickData.length > 0 ? candlestickData[0].open : 0;
  const priceChange = currentPrice - firstPrice;
  const percentChange = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || candlestickData.length === 0) return;

    // Clean up existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
    }

    // Create new chart
    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.9)',
      },
      grid: {
        vertLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
        horzLines: {
          color: 'rgba(197, 203, 206, 0.1)',
        },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: 'rgba(197, 203, 206, 0.2)',
      },
      timeScale: {
        borderColor: 'rgba(197, 203, 206, 0.2)',
        timeVisible: true,
        secondsVisible: false,
      },
    });

    // Add candlestick series
    const candlestickSeries = (chart as any).addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
    });

    // Set data
    candlestickSeries.setData(candlestickData);

    // Store references
    chartInstanceRef.current = chart;
    candlestickSeriesRef.current = candlestickSeries;

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        candlestickSeriesRef.current = null;
      }
    };
  }, [candlestickData]);

  // Update chart data when it changes
  useEffect(() => {
    if (candlestickSeriesRef.current && candlestickData.length > 0) {
      candlestickSeriesRef.current.setData(candlestickData);
    }
  }, [candlestickData]);

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
          {candlestickData.length > 0 ? (
            <div 
              ref={chartRef} 
              className="w-full h-full"
              style={{ minHeight: '400px' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <svg className="w-16 h-16 text-muted-foreground mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
                </svg>
                <p className="text-muted-foreground">No candlestick data available</p>
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
                variant={selectedTimeframe === timeframe.value ? "default" : "ghost"}
                size="sm"
                className="px-3 py-1.5 text-sm"
                onClick={() => setSelectedTimeframe(timeframe.value)}
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
