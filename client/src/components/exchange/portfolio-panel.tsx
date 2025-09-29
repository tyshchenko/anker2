import { useMemo, useState, useEffect, useRef } from "react";
import { createChart, ColorType } from 'lightweight-charts';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Expand, TrendingUp, Eye, EyeOff, Wallet } from "lucide-react";
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";
import bnbLogo from "@assets/BNB_1757408614597.png";
import solLogo from "@assets/SOL_1757408614598.png";

const timeframes = [
  { label: "1D", value: "1D" },
  { label: "1W", value: "1W" },
  { label: "1M", value: "1M" },
  { label: "3M", value: "3M" },
];

// Fake portfolio wallets data
const PORTFOLIO_WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin',
    symbol: 'BTC',
    logoUrl: btcLogo,
    balance: 0.25843,
    balanceZAR: 312450.50,
    color: 'bg-orange-500',
    textColor: 'text-orange-600',
    change24h: 5.2
  },
  {
    id: 'eth-wallet',
    name: 'Ethereum',
    symbol: 'ETH',
    logoUrl: ethLogo,
    balance: 8.42,
    balanceZAR: 156780.25,
    color: 'bg-blue-500',
    textColor: 'text-blue-600',
    change24h: 3.8
  },
  {
    id: 'usdt-wallet',
    name: 'Tether',
    symbol: 'USDT',
    logoUrl: usdtLogo,
    balance: 25000,
    balanceZAR: 467500.00,
    color: 'bg-green-500',
    textColor: 'text-green-600',
    change24h: 0.1
  },
  {
    id: 'bnb-wallet',
    name: 'BNB',
    symbol: 'BNB',
    logoUrl: bnbLogo,
    balance: 45.67,
    balanceZAR: 89234.50,
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    change24h: 2.4
  },
  {
    id: 'sol-wallet',
    name: 'Solana',
    symbol: 'SOL',
    logoUrl: solLogo,
    balance: 123.45,
    balanceZAR: 78950.75,
    color: 'bg-purple-500',
    textColor: 'text-purple-600',
    change24h: 7.1
  },
];

export function PortfolioPanel() {
  const [selectedTimeframe, setSelectedTimeframe] = useState("1M");
  const [showBalances, setShowBalances] = useState(true);
  
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const lineSeriesRef = useRef<any>(null);

  // Generate fake growing portfolio data
  const portfolioData = useMemo(() => {
    const now = Date.now();
    const dataPoints = [];
    const intervals = selectedTimeframe === "1D" ? 24 : 
                     selectedTimeframe === "1W" ? 7 * 24 : 
                     selectedTimeframe === "1M" ? 30 * 24 : 90 * 24;
    
    const baseValue = 950000; // Starting portfolio value in ZAR
    const growthRate = selectedTimeframe === "1D" ? 0.001 : 
                      selectedTimeframe === "1W" ? 0.005 : 
                      selectedTimeframe === "1M" ? 0.02 : 0.08; // Higher growth for longer periods
    
    for (let i = 0; i < intervals; i++) {
      const timestamp = Math.floor((now - (intervals - i) * 60 * 60 * 1000) / 1000);
      // Generate growing trend with some volatility
      const progress = i / intervals;
      const growth = baseValue * (1 + growthRate * progress);
      const volatility = baseValue * 0.02 * Math.sin(i * 0.1) * Math.random();
      const value = growth + volatility;
      
      dataPoints.push({
        time: timestamp as any,
        value: Math.max(value, baseValue * 0.95) // Ensure minimum value
      });
    }
    
    return dataPoints.sort((a, b) => (a.time as number) - (b.time as number));
  }, [selectedTimeframe]);

  const totalValue = portfolioData.length > 0 ? portfolioData[portfolioData.length - 1].value : 0;
  const initialValue = portfolioData.length > 0 ? portfolioData[0].value : 0;
  const totalChange = totalValue - initialValue;
  const percentChange = initialValue > 0 ? (totalChange / initialValue) * 100 : 0;
  const totalWalletValue = PORTFOLIO_WALLETS.reduce((sum, wallet) => sum + wallet.balanceZAR, 0);

  // Initialize chart
  useEffect(() => {
    if (!chartRef.current || portfolioData.length === 0) return;

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
    
    // Add line series for portfolio value
    const lineSeries = chart.addLineSeries({
      color: '#26a69a',
      lineWidth: 3,
    });

    // Set data
    lineSeries.setData(portfolioData);

    // Store references
    chartInstanceRef.current = chart;
    lineSeriesRef.current = lineSeries;

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
        lineSeriesRef.current = null;
      }
    };
  }, [portfolioData]);

  const formatPrice = (price: number) => {
    return `R${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatBalance = (balance: number, symbol: string) => {
    if (symbol === 'USDT') {
      return balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    return balance.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 8 });
  };

  return (
    <section className="flex-1 p-6">
      <div className="h-full flex flex-col space-y-6">
        {/* Portfolio Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between space-y-4 sm:space-y-0">
          <div>
            <div className="text-sm text-muted-foreground mb-1">Total Portfolio Value</div>
            <h1 className="text-3xl font-bold tracking-tight" data-testid="text-portfolio-value">
              {formatPrice(totalWalletValue)}
            </h1>
          </div>
          <div className="text-right">
            <div 
              className={`text-2xl font-bold font-mono ${percentChange >= 0 ? "text-green-600" : "text-red-600"}`}
              data-testid="text-portfolio-change"
            >
              {percentChange >= 0 ? "+" : ""}{formatPrice(totalChange)} ({percentChange.toFixed(2)}%)
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
          <Button variant="outline" size="sm" data-testid="button-fullscreen">
            <Expand className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
        </div>

        {/* Portfolio Assets */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-semibold">Portfolio Assets</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowBalances(!showBalances)}
              data-testid="button-toggle-balances"
            >
              {showBalances ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {PORTFOLIO_WALLETS.map((wallet) => (
              <Card key={wallet.id} className="p-4 hover:shadow-lg transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${wallet.color}`}>
                      <img 
                        src={wallet.logoUrl} 
                        alt={wallet.name}
                        className="w-6 h-6"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold">{wallet.name}</h3>
                      <p className="text-sm text-muted-foreground">{wallet.symbol}</p>
                    </div>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={wallet.change24h >= 0 ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />
                    {wallet.change24h >= 0 ? "+" : ""}{wallet.change24h.toFixed(1)}%
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Balance:</span>
                    <span className="font-mono">
                      {showBalances ? formatBalance(wallet.balance, wallet.symbol) : "****"} {wallet.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Value:</span>
                    <span className="font-mono font-semibold">
                      {showBalances ? formatPrice(wallet.balanceZAR) : "R****"}
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}