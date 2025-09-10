import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useWallets } from "@/hooks/useWallets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoginDialog } from "@/components/auth/login-dialog";

interface TradingPanelProps {
  onPairChange: (from: string, to: string, action: "buy" | "sell" | "convert") => void;
}

interface Trade {
  id: string;
  type: "buy" | "sell" | "convert";
  fromAsset: string;
  toAsset: string;
  fromAmount: number;
  toAmount: number;
  rate: number;
  fee: number;
  status: "pending" | "completed" | "failed";
  timestamp: string;
}

const FEE_RATE = 0.001; // 0.10%

interface MarketData {
  pair: string;
  price: string;
  change_24h: string;
  volume_24h: string;
  timestamp: string;
}

// Fetch market data from server
const useMarketData = () => {
  return useQuery({
    queryKey: ['/api/market'],
    queryFn: async (): Promise<MarketData[]> => {
      const response = await fetch('/api/market');
      if (!response.ok) throw new Error('Failed to fetch market data');
      return response.json();
    },
    refetchInterval: 10000, // Refetch every 10 seconds
  });
};

type ActionTab = "buy" | "sell" | "convert";

// Extract unique assets from market pairs
function getAvailableAssets(marketData: MarketData[]) {
  if (!marketData || marketData.length === 0) {
    return {
      cryptos: ["BTC", "ETH", "USDT"], // Default fallback
      fiats: ["ZAR", "USD", "EUR"], // Default fallback
      all: ["BTC", "ETH", "USDT", "ZAR", "USD", "EUR"]
    };
  }
  
  const cryptos = new Set<string>();
  const fiats = new Set<string>();
  
  marketData.forEach(data => {
    const [crypto, fiat] = data.pair.split('/');
    if (crypto && fiat) {
      cryptos.add(crypto);
      fiats.add(fiat);
    }
  });
  
  return {
    cryptos: Array.from(cryptos),
    fiats: Array.from(fiats), 
    all: Array.from(new Set([...Array.from(cryptos), ...Array.from(fiats)]))
  };
}

// Get exchange rate between two assets using server data
function getExchangeRate(from: string, to: string, marketData: MarketData[]): number {
  if (from === to) return 1;
  if (!marketData || marketData.length === 0) return 0;
  
  // Direct pair (CRYPTO/FIAT)
  const directPair = marketData.find(data => data.pair === `${from}/${to}`);
  if (directPair && parseFloat(directPair.price) > 0) {
    return parseFloat(directPair.price);
  }
  
  // Reverse pair (FIAT/CRYPTO)
  const reversePair = marketData.find(data => data.pair === `${to}/${from}`);
  if (reversePair && parseFloat(reversePair.price) > 0) {
    return 1 / parseFloat(reversePair.price);
  }
  
  // Cross-rate through ZAR
  if (from !== 'ZAR' && to !== 'ZAR') {
    const fromToZAR = getExchangeRate(from, 'ZAR', marketData);
    const toToZAR = getExchangeRate(to, 'ZAR', marketData);
    if (fromToZAR > 0 && toToZAR > 0) {
      return fromToZAR / toToZAR;
    }
  }
  
  return 0; // No rate available
}

// Check if a trading pair is available
function isPairAvailable(from: string, to: string, marketData: MarketData[]): boolean {
  return getExchangeRate(from, to, marketData) > 0;
}

function formatAmount(asset: string, amount: number): string {
  if (!Number.isFinite(amount)) return "–";
  // Basic formatting - could be enhanced based on asset type
  if (asset === "BTC") return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  if (asset === "ETH") return amount.toLocaleString(undefined, { maximumFractionDigits: 5 });
  if (["USDT", "USD", "EUR", "GBP", "ZAR"].includes(asset)) {
    return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function calculateQuote(from: string, to: string, fromAmount: number, marketData: MarketData[]) {
  const rate = getExchangeRate(from, to, marketData);
  
  if (!rate || !Number.isFinite(fromAmount) || fromAmount <= 0) {
    return { toAmount: 0, rate: 0, fee: 0 };
  }
  
  const grossTo = fromAmount * rate;
  const fee = grossTo * FEE_RATE;
  const netTo = Math.max(grossTo - fee, 0);
  
  return { toAmount: netTo, rate, fee };
}

// Fetch user trades
const useUserTrades = () => {
  const { user, isAuthenticated } = useAuth();
  
  return useQuery({
    queryKey: ['/api/trades', user?.id],
    queryFn: async (): Promise<Trade[]> => {
      if (!user?.id) throw new Error('User not authenticated');
      
      const response = await fetch(`/api/trades/${user.id}`, {
        credentials: 'include', // Include session cookies
      });
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      return data.data

    },
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export function TradingPanel({ onPairChange }: TradingPanelProps) {
  const { data: marketData = [], isLoading, error } = useMarketData();
  const { user, isAuthenticated } = useAuth();
  const { data: walletsData } = useWallets();
  const { data: userTrades = [], isLoading: tradesLoading } = useUserTrades();
  const [activeTab, setActiveTab] = useState<ActionTab>("buy");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  
  const availableAssets = useMemo(() => getAvailableAssets(marketData), [marketData]);

  // Get user's balance for a specific asset
  const getUserBalance = (asset: string): number => {
    if (!walletsData?.wallets) return 0;
    
    const wallet = walletsData.wallets.find(w => 
      w.coin.toLowerCase() === asset.toLowerCase()
    );
    
    return wallet ? parseFloat(wallet.balance) : 0;
  };
  
  // Buy state
  const [fromBuy, setFromBuy] = useState("ZAR");
  const [toBuy, setToBuy] = useState("BTC");
  const [amountBuy, setAmountBuy] = useState("");
  
  // Sell state
  const [fromSell, setFromSell] = useState("BTC");
  const [toSell, setToSell] = useState("ZAR");
  const [amountSell, setAmountSell] = useState("");
  
  // Convert state
  const [fromConvert, setFromConvert] = useState("BTC");
  const [toConvert, setToConvert] = useState("ETH");
  const [amountConvert, setAmountConvert] = useState("");

  // Calculate quotes using real market data
  const buyQuote = useMemo(() => 
    calculateQuote(fromBuy, toBuy, parseFloat(amountBuy) || 0, marketData), 
    [fromBuy, toBuy, amountBuy, marketData]
  );
  
  const sellQuote = useMemo(() => 
    calculateQuote(fromSell, toSell, parseFloat(amountSell) || 0, marketData), 
    [fromSell, toSell, amountSell, marketData]
  );
  
  const convertQuote = useMemo(() => 
    calculateQuote(fromConvert, toConvert, parseFloat(amountConvert) || 0, marketData), 
    [fromConvert, toConvert, amountConvert, marketData]
  );

  // Check if user has sufficient balance for trades
  const hasEnoughBalance = useMemo(() => {
    if (!isAuthenticated) return false;
    
    const userAmount = parseFloat(
      activeTab === "buy" ? amountBuy : 
      activeTab === "sell" ? amountSell : 
      amountConvert
    ) || 0;
    
    const fromAsset = 
      activeTab === "buy" ? fromBuy : 
      activeTab === "sell" ? fromSell : 
      fromConvert;
    
    const userBalance = getUserBalance(fromAsset);
    return userBalance >= userAmount;
  }, [activeTab, amountBuy, amountSell, amountConvert, fromBuy, fromSell, fromConvert, walletsData, isAuthenticated]);

  // Update parent component when pairs change
  useEffect(() => {
    if (activeTab === "buy") {
      onPairChange(fromBuy, toBuy, "buy");
    } else if (activeTab === "sell") {
      onPairChange(fromSell, toSell, "sell");
    } else {
      onPairChange(fromConvert, toConvert, "convert");
    }
  }, [activeTab, fromBuy, toBuy, fromSell, toSell, fromConvert, toConvert, onPairChange]);

  const handleTabChange = (tab: ActionTab) => {
    setActiveTab(tab);
  };

  const handleQuickAmount = (amount: string) => {
    if (activeTab === "buy") {
      setAmountBuy(amount);
    } else if (activeTab === "sell") {
      setAmountSell(amount);
    } else {
      setAmountConvert(amount);
    }
  };

  const TabButton = ({ tab, label }: { tab: ActionTab; label: string }) => (
    <Button
      variant={activeTab === tab ? "default" : "ghost"}
      size="sm"
      className="flex-1"
      onClick={() => handleTabChange(tab)}
      data-testid={`tab-${tab}`}
    >
      {label}
    </Button>
  );

  const QuickAmountButtons = () => (
    <div className="grid grid-cols-4 gap-2">
      {["500", "1000", "5000", "Max"].map((amount) => (
        <Button
          key={amount}
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => handleQuickAmount(amount === "Max" ? "10000" : amount)}
          data-testid={`button-quick-${amount.toLowerCase()}`}
        >
          {amount === "Max" ? "Max" : `R${amount}`}
        </Button>
      ))}
    </div>
  );

  const OrderSummary = ({ quote, from, to }: { quote: any; from: string; to: string }) => (
    <div className="bg-muted rounded-lg p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Rate</span>
        <span className="font-mono" data-testid="text-exchange-rate">
          1 {from} = {formatAmount(to, quote.rate)} {to}
        </span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Fee (0.10%)</span>
        <span className="font-mono" data-testid="text-trading-fee">
          {formatAmount(to, quote.fee)} {to}
        </span>
      </div>
      <div className="h-px bg-border" />
      <div className="flex justify-between font-semibold">
        <span>You receive</span>
        <span className="font-mono" data-testid="text-receive-amount">
          {formatAmount(to, quote.toAmount)} {to}
        </span>
      </div>
    </div>
  );

  return (
    <aside className="w-full lg:w-96 bg-card border-l border-border trading-panel">
      <div className="h-full flex flex-col">
        {/* Trading Tabs */}
        <div className="p-4 border-b border-border">
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
            <TabButton tab="buy" label="Buy" />
            <TabButton tab="sell" label="Sell" />
            <TabButton tab="convert" label="Convert" />
          </div>
        </div>

        {/* Trading Forms */}
        <div className="flex-1 p-4 space-y-4">
          {activeTab === "buy" && (
            <div className="space-y-4" data-testid="form-buy">
              <div>
                <Label htmlFor="pay-with">Pay with</Label>
                <Select value={fromBuy} onValueChange={setFromBuy}>
                  <SelectTrigger data-testid="select-pay-with">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.fiats.map((currency) => {
                      const hasAvailablePairs = availableAssets.cryptos.some(crypto => 
                        isPairAvailable(currency, crypto, marketData)
                      );
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!hasAvailablePairs}
                        >
                          {currency} {!hasAvailablePairs ? '(No pairs available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="buy-asset">Buy</Label>
                <Select value={toBuy} onValueChange={setToBuy}>
                  <SelectTrigger data-testid="select-buy-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.cryptos.map((currency) => {
                      const isAvailable = isPairAvailable(fromBuy, currency, marketData);
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!isAvailable}
                        >
                          {currency} {!isAvailable ? '(Not available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount-buy">Amount ({fromBuy})</Label>
                <Input
                  id="amount-buy"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amountBuy}
                  onChange={(e) => setAmountBuy(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-amount-buy"
                />
              </div>

              <QuickAmountButtons />

              <OrderSummary quote={buyQuote} from={fromBuy} to={toBuy} />

              <Button 
                className="w-full" 
                size="lg"
                disabled={!amountBuy || parseFloat(amountBuy) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  }
                }}
                data-testid="button-preview-buy"
              >
                {isAuthenticated && !hasEnoughBalance && parseFloat(amountBuy) > 0 
                  ? `Insufficient ${fromBuy} Balance` 
                  : "Preview Buy Order"}
              </Button>
            </div>
          )}

          {activeTab === "sell" && (
            <div className="space-y-4" data-testid="form-sell">
              <div>
                <Label htmlFor="sell-asset">Sell</Label>
                <Select value={fromSell} onValueChange={setFromSell}>
                  <SelectTrigger data-testid="select-sell-asset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.cryptos.map((currency) => {
                      const hasAvailablePairs = availableAssets.fiats.some(fiat => 
                        isPairAvailable(currency, fiat, marketData)
                      );
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!hasAvailablePairs}
                        >
                          {currency} {!hasAvailablePairs ? '(No pairs available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="receive-currency">For</Label>
                <Select value={toSell} onValueChange={setToSell}>
                  <SelectTrigger data-testid="select-receive-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.fiats.map((currency) => {
                      const isAvailable = isPairAvailable(fromSell, currency, marketData);
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!isAvailable}
                        >
                          {currency} {!isAvailable ? '(Not available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount-sell">Amount ({fromSell})</Label>
                <Input
                  id="amount-sell"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00000000"
                  value={amountSell}
                  onChange={(e) => setAmountSell(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-amount-sell"
                />
              </div>

              <OrderSummary quote={sellQuote} from={fromSell} to={toSell} />

              <Button 
                variant="destructive"
                className="w-full" 
                size="lg"
                disabled={!amountSell || parseFloat(amountSell) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  }
                }}
                data-testid="button-preview-sell"
              >
                {isAuthenticated && !hasEnoughBalance && parseFloat(amountSell) > 0 
                  ? `Insufficient ${fromSell} Balance` 
                  : "Preview Sell Order"}
              </Button>
            </div>
          )}

          {activeTab === "convert" && (
            <div className="space-y-4" data-testid="form-convert">
              <div>
                <Label htmlFor="convert-from">From</Label>
                <Select 
                  value={fromConvert} 
                  onValueChange={(value) => {
                    setFromConvert(value);
                    if (value === toConvert) {
                      setToConvert(value === "BTC" ? "ETH" : "BTC");
                    }
                  }}
                >
                  <SelectTrigger data-testid="select-convert-from">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.all.map((currency) => {
                      const hasAvailablePairs = availableAssets.all.some(other => 
                        other !== currency && isPairAvailable(currency, other, marketData)
                      );
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!hasAvailablePairs}
                        >
                          {currency} {!hasAvailablePairs ? '(No pairs available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="convert-to">To</Label>
                <Select value={toConvert} onValueChange={setToConvert}>
                  <SelectTrigger data-testid="select-convert-to">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableAssets.all.filter(a => a !== fromConvert).map((currency) => {
                      const isAvailable = isPairAvailable(fromConvert, currency, marketData);
                      return (
                        <SelectItem 
                          key={currency} 
                          value={currency}
                          disabled={!isAvailable}
                        >
                          {currency} {!isAvailable ? '(Not available)' : ''}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="amount-convert">Amount ({fromConvert})</Label>
                <Input
                  id="amount-convert"
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00000000"
                  value={amountConvert}
                  onChange={(e) => setAmountConvert(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-amount-convert"
                />
              </div>

              <OrderSummary quote={convertQuote} from={fromConvert} to={toConvert} />

              <Button 
                className="w-full" 
                size="lg"
                disabled={!amountConvert || parseFloat(amountConvert) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  }
                }}
                data-testid="button-preview-convert"
              >
                {isAuthenticated && !hasEnoughBalance && parseFloat(amountConvert) > 0 
                  ? `Insufficient ${fromConvert} Balance` 
                  : "Preview Convert"}
              </Button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border-t border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            {!isAuthenticated ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                <p>Sign in to view your trading activity</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowLoginDialog(true)}
                >
                  Sign In
                </Button>
              </div>
            ) : tradesLoading ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                Loading trades...
              </div>
            ) : userTrades.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No trading activity yet
              </div>
            ) : !userTrades ? (
              <div className="text-center text-sm text-muted-foreground py-4">
                No trading activity yet
              </div>
            ) : (
              userTrades.slice(0, 3).map((trade, index) => (
                <div key={trade.id || index} className="flex items-center justify-between text-sm">
                  <div>
                    <div className="font-medium">
                      {trade.type === "buy" ? "Bought" : trade.type === "sell" ? "Sold" : "Converted"} {trade.toAsset}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.timestamp).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">
                      {formatAmount(trade.toAsset, trade.toAmount)} {trade.toAsset}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAmount(trade.fromAsset, trade.fromAmount)} {trade.fromAsset}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Login Dialog */}
      <LoginDialog 
        open={showLoginDialog} 
        onOpenChange={setShowLoginDialog}
        onSwitchToRegister={() => {}}
      />
    </aside>
  );
}
