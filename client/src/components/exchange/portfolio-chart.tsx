import { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/queryClient";

const timeframes = [
  { label: "1H", value: "1H" },
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "ALL", value: "ALL" },
];

interface Wallet {
  symbol: string;
  balance: number;
}

interface PortfolioChartProps {
  wallets: Wallet[];
}

interface Transaction {
  id: string;
  user_id: string;
  type: string;
  from_coin?: string;
  to_coin?: string;
  coin?: string;
  amount: string;
  to_amount?: string;
  fee?: string;
  status: string;
  created_at: string;
}

export function PortfolioChart({ wallets }: PortfolioChartProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState("ALL");
  const { user } = useAuth();
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);

  // Fetch user transactions
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/transactions', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const response = await fetchWithAuth(`/api/transactions/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch transactions');
      const data = await response.json();
      return (data.transactions || []) as Transaction[];
    },
    enabled: !!user?.id,
  });

  // Extract unique crypto symbols from user wallets and transactions
  const cryptoSymbols = useMemo(() => {
    const symbols = new Set<string>();
    wallets.forEach(w => symbols.add(w.symbol));
    transactions?.forEach((tx: Transaction) => {
      if (tx.from_coin) symbols.add(tx.from_coin);
      if (tx.to_coin) symbols.add(tx.to_coin);
      if (tx.coin) symbols.add(tx.coin);
    });
    return Array.from(symbols).filter(s => s !== 'ZAR');
  }, [wallets, transactions]);
  
  // Fallback prices when API is down
  const fallbackPrices: Record<string, number> = {
    BTC: 1200000,
    ETH: 65000,
    USDT: 18.5,
    BNB: 11000,
    SOL: 3500,
    XRP: 10,
    ADA: 7,
    DOGE: 2.5,
    MATIC: 15,
    DOT: 120,
  };

  // Fetch market data for all cryptocurrencies
  const marketDataQueries = cryptoSymbols.map(crypto => 
    useQuery({
      queryKey: ['market-data', crypto, 'ZAR', selectedTimeframe],
      queryFn: async () => {
        try {
          const timeframe = selectedTimeframe === 'ALL' ? '1M' : selectedTimeframe;
          const res = await fetch(`/api/market/${crypto}/ZAR?timeframe=${timeframe}&type=OHLCV`);
          if (!res.ok) throw new Error('API Error');
          const apiData = await res.json();
          return { crypto, data: convertApiDataToChartFormat(apiData) };
        } catch (error) {
          return { crypto, data: generateFallbackData(crypto, selectedTimeframe) };
        }
      },
      retry: 1,
      staleTime: 60000,
    })
  );

  // Convert API response format to chart format
  const convertApiDataToChartFormat = (apiData: any[]) => {
    if (!Array.isArray(apiData)) return [];
    
    return apiData.map(item => ({
      time: new Date(item.timestamp).getTime() / 1000,
      open: parseFloat(item.open),
      high: parseFloat(item.high),
      low: parseFloat(item.low),
      close: item.close,
      volume: parseFloat(item.volume_24h || 0)
    }));
  };

  // Generate fallback market data when API is unavailable
  const generateFallbackData = (crypto: string, timeframe: string) => {
    const basePrice = fallbackPrices[crypto] || 1000;
    const dataPoints = timeframe === '1H' ? 60 : timeframe === '1D' ? 24 : timeframe === '1W' ? 7 : 30;
    const now = Math.floor(Date.now() / 1000);
    const interval = timeframe === '1H' ? 60 : timeframe === '1D' ? 3600 : timeframe === '1W' ? 86400 : 86400;
    
    const data = [];
    for (let i = dataPoints; i >= 0; i--) {
      const time = now - (i * interval);
      const variation = (Math.random() - 0.5) * 0.1;
      const price = basePrice * (1 + variation);
      data.push({
        time: time,
        open: price * 0.998,
        high: price * 1.005,
        low: price * 0.995,
        close: price.toString(),
        volume: Math.random() * 1000000
      });
    }
    return data;
  };

  // Calculate portfolio data based on transactions and market data
  const portfolioData = useMemo(() => {
    if (!transactions || transactions.length === 0 || marketDataQueries.some(q => q.isLoading)) {
      return [];
    }

    // Build market data lookup
    const marketDataLookup: Record<string, any[]> = {};
    marketDataQueries.forEach(query => {
      if (query.data?.crypto && query.data?.data) {
        marketDataLookup[query.data.crypto] = query.data.data;
      }
    });

    // Helper function to get price at specific timestamp
    const getPriceAtTime = (crypto: string, timestamp: number): number => {
      if (crypto === 'ZAR') return 1;
      
      const marketData = marketDataLookup[crypto];
      if (!marketData || marketData.length === 0) {
        return fallbackPrices[crypto] || 0;
      }

      // Find closest price data point
      const closestPoint = marketData.reduce((prev, curr) => {
        const prevDiff = Math.abs(prev.time - timestamp);
        const currDiff = Math.abs(curr.time - timestamp);
        return currDiff < prevDiff ? curr : prev;
      });

      return parseFloat(closestPoint.close);
    };

    // Sort transactions by timestamp
    const sortedTransactions = [...transactions]
      .filter(tx => tx.status === 'completed' || tx.status === 'pending')
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (sortedTransactions.length === 0) {
      return [];
    }

    // Track holdings over time
    const holdings: Record<string, number> = {};
    const portfolioTimeline: { time: number; value: number }[] = [];

    // Initialize with zero
    const firstTxTime = Math.floor(new Date(sortedTransactions[0].created_at).getTime() / 1000);
    portfolioTimeline.push({ time: (firstTxTime - 1) as any, value: 0 });

    // Process each transaction
    sortedTransactions.forEach(tx => {
      const txTime = Math.floor(new Date(tx.created_at).getTime() / 1000);
      const amount = parseFloat(tx.amount);
      const toAmount = tx.to_amount ? parseFloat(tx.to_amount) : 0;
      const fee = tx.fee ? parseFloat(tx.fee) : 0;

      // Update holdings based on transaction type
      if (tx.type === 'deposit') {
        const coin = tx.coin || tx.to_coin || 'ZAR';
        holdings[coin] = (holdings[coin] || 0) + amount;
      } else if (tx.type === 'withdrawal') {
        const coin = tx.coin || tx.from_coin || 'ZAR';
        holdings[coin] = (holdings[coin] || 0) - amount - fee;
      } else if (tx.type === 'buy') {
        const fromCoin = tx.from_coin || 'ZAR';
        const toCoin = tx.to_coin || 'BTC';
        holdings[fromCoin] = (holdings[fromCoin] || 0) - amount;
        holdings[toCoin] = (holdings[toCoin] || 0) + toAmount - fee;
      } else if (tx.type === 'sell') {
        const fromCoin = tx.from_coin || 'BTC';
        const toCoin = tx.to_coin || 'ZAR';
        holdings[fromCoin] = (holdings[fromCoin] || 0) - amount - fee;
        holdings[toCoin] = (holdings[toCoin] || 0) + toAmount;
      } else if (tx.type === 'convert') {
        const fromCoin = tx.from_coin || 'BTC';
        const toCoin = tx.to_coin || 'ETH';
        holdings[fromCoin] = (holdings[fromCoin] || 0) - amount;
        holdings[toCoin] = (holdings[toCoin] || 0) + toAmount - fee;
      }

      // Calculate total portfolio value at this point
      let totalValue = 0;
      Object.entries(holdings).forEach(([coin, balance]) => {
        if (balance > 0) {
          const price = getPriceAtTime(coin, txTime);
          totalValue += balance * price;
        }
      });

      portfolioTimeline.push({ time: txTime as any, value: totalValue });
    });

    // Add current value point
    const now = Math.floor(Date.now() / 1000);
    let currentValue = 0;
    Object.entries(holdings).forEach(([coin, balance]) => {
      if (balance > 0) {
        const price = getPriceAtTime(coin, now);
        currentValue += balance * price;
      }
    });
    portfolioTimeline.push({ time: now as any, value: currentValue });

    // Fill in intermediate points with price changes
    const detailedTimeline: { time: number; value: number }[] = [];
    
    for (let i = 0; i < portfolioTimeline.length - 1; i++) {
      const currentPoint = portfolioTimeline[i];
      const nextPoint = portfolioTimeline[i + 1];
      
      detailedTimeline.push(currentPoint);

      // Add market data points between transactions
      Object.keys(marketDataLookup).forEach(crypto => {
        const marketData = marketDataLookup[crypto];
        const relevantPoints = marketData.filter(
          point => point.time > currentPoint.time && point.time < nextPoint.time
        );

        relevantPoints.forEach(point => {
          // Recalculate portfolio value at this market data point
          let value = 0;
          Object.entries(holdings).forEach(([coin, balance]) => {
            if (balance > 0) {
              const price = getPriceAtTime(coin, point.time);
              value += balance * price;
            }
          });
          detailedTimeline.push({ time: point.time as any, value });
        });
      });
    }
    
    // Add final point
    detailedTimeline.push(portfolioTimeline[portfolioTimeline.length - 1]);

    // Sort and deduplicate
    const uniqueTimeline = Array.from(
      new Map(detailedTimeline.map(item => [item.time, item])).values()
    ).sort((a, b) => a.time - b.time);

    // Filter by timeframe
    if (selectedTimeframe !== 'ALL') {
      const now = Math.floor(Date.now() / 1000);
      const timeframeSeconds: Record<string, number> = {
        '1H': 3600,
        '1D': 86400,
        '1W': 604800,
        '1M': 2592000,
      };
      const cutoff = now - (timeframeSeconds[selectedTimeframe] || 2592000);
      return uniqueTimeline.filter(point => point.time >= cutoff);
    }

    return uniqueTimeline;
  }, [transactions, marketDataQueries, selectedTimeframe]);

  const isLoading = transactionsLoading || marketDataQueries.some(query => query.isLoading);

  const totalValue = portfolioData.length > 0 ? portfolioData[portfolioData.length - 1].value : 0;
  const initialValue = portfolioData.length > 0 ? portfolioData[0].value : 0;
  const totalChange = totalValue - initialValue;
  const percentChange = initialValue > 0 ? (totalChange / initialValue) * 100 : 0;

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || portfolioData.length === 0) return;

    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
    }

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
    
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#26a69a',
      lineWidth: 3,
    });

    lineSeries.setData(portfolioData as any);

    chartInstanceRef.current = chart;
    lineSeriesRef.current = lineSeries;

    const handleResize = () => {
      if (chartRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartRef.current.clientWidth,
          height: chartRef.current.clientHeight,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        lineSeriesRef.current = null;
      }
    };
  }, [portfolioData]);

  const formatPrice = (price: number) => {
    return `R${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Portfolio Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-portfolio-value">
            {isLoading ? "Loading..." : formatPrice(totalValue)}
          </h1>
        </div>
        <div className="text-right">
          <div 
            className={`text-2xl font-bold font-mono ${percentChange >= 0 ? "text-green-600" : "text-red-600"}`}
            data-testid="text-portfolio-change"
          >
            {isLoading ? "..." : `${percentChange >= 0 ? "+" : ""}${formatPrice(totalChange)} (${percentChange.toFixed(2)}%)`}
          </div>
          <div className="text-sm text-muted-foreground">
            {selectedTimeframe} Performance
          </div>
        </div>
      </div>

      {/* Chart Container */}
      <div className="flex-1 min-h-[300px] bg-card rounded-xl border border-border p-4 chart-container">
        <div 
          ref={chartRef} 
          className="w-full h-full"
          style={{ minHeight: '300px' }}
        />
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
      </div>
    </div>
  );
}
