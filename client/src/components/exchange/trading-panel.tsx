import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/queryClient";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LoginDialog } from "@/components/auth/login-dialog";

interface TradingPanelProps {
  onPairChange: (from: string, to: string, action: "buy" | "sell" | "convert") => void;
  mode?: 'all' | 'buy' | 'sell';
}

interface Trade {
  id: string;
  type: "buy" | "sell" | "convert";
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

const FEE_RATE = 0.01; // 1%

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
      const response = await fetchWithAuth('/api/market');
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

// Get decimal places for an asset
function getAssetDecimals(asset: string): number {
  if (asset === "BTC") return 6;
  if (asset === "ETH") return 5;
  if (["USDT", "USD", "EUR", "GBP", "ZAR"].includes(asset)) return 2;
  return 4;
}

// Round down to specified decimal places
function floorToDecimals(amount: number, decimals: number): number {
  const multiplier = Math.pow(10, decimals);
  return Math.floor(amount * multiplier) / multiplier;
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
      
      const response = await fetchWithAuth(`/api/trades/${user.id}`);
      if (!response.ok) throw new Error('Failed to fetch trades');
      const data = await response.json();
      return data.data

    },
    enabled: isAuthenticated && !!user?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export function TradingPanel({ onPairChange, mode = 'all' }: TradingPanelProps) {
  const { data: marketData = [], isLoading, error } = useMarketData();
  const { user, isAuthenticated } = useAuth();
  const { data: walletsData } = useWallets();
  const { data: userTrades = [], isLoading: tradesLoading } = useUserTrades();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<ActionTab>("buy");
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [isConfirmingOrder, setIsConfirmingOrder] = useState(false);
  const [previewOrder, setPreviewOrder] = useState<{
    type: ActionTab;
    from: string;
    to: string;
    amount: string;
    quote: any;
  } | null>(null);
  
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
    let finalAmount = amount;
    
    if (amount === "Max") {
      // Get the appropriate asset for the current tab
      const fromAsset = activeTab === "buy" ? fromBuy : 
                       activeTab === "sell" ? fromSell : 
                       fromConvert;
      
      // Get user's balance for this asset
      const userBalance = getUserBalance(fromAsset);
      
      // Round down to proper decimal places for this asset
      const decimals = getAssetDecimals(fromAsset);
      const maxAmount = floorToDecimals(userBalance, decimals);
      
      // Convert to string without scientific notation
      finalAmount = maxAmount.toFixed(decimals).replace(/\.?0+$/, '');
    }
    
    if (activeTab === "buy") {
      setAmountBuy(finalAmount);
    } else if (activeTab === "sell") {
      setAmountSell(finalAmount);
    } else {
      setAmountConvert(finalAmount);
    }
  };

  const handlePreviewOrder = (type: ActionTab) => {
    let from: string, to: string, amount: string, quote: any;
    
    if (type === "buy") {
      from = fromBuy;
      to = toBuy;
      amount = amountBuy;
      quote = buyQuote;
    } else if (type === "sell") {
      from = fromSell;
      to = toSell;
      amount = amountSell;
      quote = sellQuote;
    } else {
      from = fromConvert;
      to = toConvert;
      amount = amountConvert;
      quote = convertQuote;
    }
    
    setPreviewOrder({ type, from, to, amount, quote });
    setShowPreviewModal(true);
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
          onClick={() => handleQuickAmount(amount)}
          data-testid={`button-quick-${amount.toLowerCase()}`}
        >
          {amount === "Max" ? "Max" : `R${amount}`}
        </Button>
      ))}
    </div>
  );

  const OrderSummary = ({ quote, from, to, ordertype }: { quote: any; from: string; to: string; ordertype: string }) => (
    <div className="bg-muted rounded-lg p-4 space-y-3">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Rate</span>
        <span className="font-mono" data-testid="text-exchange-rate">
          {ordertype === "buy" || ordertype === "sell" ? (
                      ordertype === "buy" ? 
                        `1 ${to} = ${formatAmount(from, 1 / quote.rate)} ${from}` :
                        `1 ${from} = ${formatAmount(to, quote.rate)} ${to}`
                    ) : (
                      `1 ${from} = ${formatAmount(to, quote.rate)} ${to}`
                    )}
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
    <aside className={`${mode !== 'all' ? '' : 'w-full lg:w-96 bg-card border-l border-border trading-panel'}`}>
      <div className="h-full flex flex-col">
        {/* Trading Tabs */}
        <div className={`p-4 border-b border-border ${mode !== 'all' ? 'hidden' : ''}`}>
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
              <div className={mode !== 'all' ? 'hidden' : ''}>
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

              <div className={mode !== 'all' ? 'hidden' : ''}>
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

              <OrderSummary quote={buyQuote} from={fromBuy} to={toBuy} ordertype='buy' />

              <Button 
                className="w-full" 
                size="lg"
                disabled={!amountBuy || parseFloat(amountBuy) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  } else {
                    handlePreviewOrder("buy");
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
                <div className="relative">
                  <Input
                    id="amount-sell"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={amountSell}
                    onChange={(e) => setAmountSell(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="pr-16"
                    data-testid="input-amount-sell"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs font-medium hover:bg-muted"
                    onClick={() => {
                      const balance = getUserBalance(fromSell);
                      const maxAmount = floorToDecimals(balance, getAssetDecimals(fromSell));
                      setAmountSell(maxAmount.toString());
                    }}
                    data-testid="button-max-sell"
                  >
                    Max
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Available: {formatAmount(fromSell, getUserBalance(fromSell))} {fromSell}
                </div>
              </div>

              <OrderSummary quote={sellQuote} from={fromSell} to={toSell} ordertype='sell' />

              <Button 
                variant="destructive"
                className="w-full" 
                size="lg"
                disabled={!amountSell || parseFloat(amountSell) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  } else {
                    handlePreviewOrder("sell");
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
                <div className="relative">
                  <Input
                    id="amount-convert"
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00000000"
                    value={amountConvert}
                    onChange={(e) => setAmountConvert(e.target.value.replace(/[^0-9.]/g, ""))}
                    className="pr-16"
                    data-testid="input-amount-convert"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-7 px-2 text-xs font-medium hover:bg-muted"
                    onClick={() => {
                      const balance = getUserBalance(fromConvert);
                      const maxAmount = floorToDecimals(balance, getAssetDecimals(fromConvert));
                      setAmountConvert(maxAmount.toString());
                    }}
                    data-testid="button-max-convert"
                  >
                    Max
                  </Button>
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  Available: {formatAmount(fromConvert, getUserBalance(fromConvert))} {fromConvert}
                </div>
              </div>

              <OrderSummary quote={convertQuote} from={fromConvert} to={toConvert} ordertype='convert' />

              <Button 
                className="w-full" 
                size="lg"
                disabled={!amountConvert || parseFloat(amountConvert) <= 0 || (isAuthenticated && !hasEnoughBalance)}
                onClick={() => {
                  if (!isAuthenticated) {
                    setShowLoginDialog(true);
                  } else {
                    handlePreviewOrder("convert");
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
        <div className={`border-t border-border p-4 ${mode !== 'all' ? 'hidden' : ''}`}>
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
                      {trade.type === "buy" ? "Bought" : trade.type === "sell" ? "Sold" : "Converted"} {trade.to_asset}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(trade.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono">
                      {formatAmount(trade.to_asset, trade.to_amount)} {trade.to_asset}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatAmount(trade.from_asset, trade.from_amount)} {trade.from_asset}
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

      {/* Preview Order Modal */}
      <Dialog open={showPreviewModal} onOpenChange={setShowPreviewModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              Preview {previewOrder?.type === "buy" ? "Buy" : previewOrder?.type === "sell" ? "Sell" : "Convert"} Order
            </DialogTitle>
            <DialogDescription>
              Please review your order details before confirming.
            </DialogDescription>
          </DialogHeader>
          
          {previewOrder && (
            <div className="space-y-4">
              {/* Order Details */}
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    {previewOrder.type === "buy" ? "Pay with" : "From"}
                  </span>
                  <span className="font-medium">
                    {formatAmount(previewOrder.from, parseFloat(previewOrder.amount))} {previewOrder.from}
                  </span>
                </div>
                
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Exchange Rate</span>
                  <span className="font-mono">
                    {previewOrder.type === "buy" || previewOrder.type === "sell" ? (
                      previewOrder.type === "buy" ? 
                        `1 ${previewOrder.to} = ${formatAmount(previewOrder.from, 1 / previewOrder.quote.rate)} ${previewOrder.from}` :
                        `1 ${previewOrder.from} = ${formatAmount(previewOrder.to, previewOrder.quote.rate)} ${previewOrder.to}`
                    ) : (
                      `1 ${previewOrder.from} = ${formatAmount(previewOrder.to, previewOrder.quote.rate)} ${previewOrder.to}`
                    )}
                  </span>
                </div>
                

                <div className="h-px bg-border" />
                
                <div className="flex justify-between font-semibold">
                  <span>You receive</span>
                  <span className="font-mono text-green-600">
                    {formatAmount(previewOrder.to, previewOrder.quote.toAmount)} {previewOrder.to}
                  </span>
                </div>
              </div>

              {/* Your Balance */}
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Your {previewOrder.from} Balance</span>
                  <span className="font-mono">
                    {formatAmount(previewOrder.from, getUserBalance(previewOrder.from))} {previewOrder.from}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => setShowPreviewModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  className="flex-1"
                  variant={previewOrder.type === "sell" ? "destructive" : "default"}
                  disabled={isConfirmingOrder}
                  onClick={async () => {
                    if (isConfirmingOrder) return; // Prevent double clicks
                    
                    setIsConfirmingOrder(true);
                    try {
                      // Prepare trade data for API
                      const tradeData = {
                        user_id: user?.id,
                        type: previewOrder.type,
                        from_asset: previewOrder.from,
                        to_asset: previewOrder.to,
                        from_amount: parseFloat(previewOrder.amount),
                        to_amount: previewOrder.quote.toAmount,
                        rate: previewOrder.quote.rate,
                        fee: previewOrder.quote.fee,
                        status: "pending"
                      };

                      // Send POST request to create trade
                      const response = await fetchWithAuth('/api/trades', {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                        },
                        body: JSON.stringify(tradeData)
                      });

                      if (response.ok) {
                        const result = await response.json();
                        console.log("Trade created successfully:", result);
                        
                        // Refresh wallet balances after successful trade
                        await queryClient.invalidateQueries({
                          queryKey: ['/api/wallets', user?.email, user?.id]
                        });
                        
                        // Also refresh trades list
                        await queryClient.invalidateQueries({
                          queryKey: ['/api/trades', user?.id]
                        });
                        
                        setShowPreviewModal(false);
                        // You might want to show a success message here
                      } else {
                        const error = await response.json();
                        console.error("Failed to create trade:", error);
                        // You might want to show an error message here
                      }
                    } catch (error) {
                      console.error("Error creating trade:", error);
                      // You might want to show an error message here
                    } finally {
                      setIsConfirmingOrder(false);
                    }
                  }}
                >
                  {isConfirmingOrder ? "Confirming..." : `Confirm ${previewOrder.type === "buy" ? "Buy" : previewOrder.type === "sell" ? "Sell" : "Convert"}`}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </aside>
  );
}
