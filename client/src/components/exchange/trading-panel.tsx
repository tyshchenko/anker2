import { useState, useMemo, useEffect } from "react";
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

interface TradingPanelProps {
  onPairChange: (from: string, to: string, action: "buy" | "sell" | "convert") => void;
}

const FIAT = ["ZAR", "USD", "EUR", "GBP"] as const;
const CRYPTO = ["BTC", "ETH", "USDT"] as const;
const ALL_ASSETS = [...FIAT, ...CRYPTO] as const;

const FX_ZAR_PER = {
  USD: 18.5,
  EUR: 20.0,
  GBP: 23.0,
};

const USD_PRICES = {
  BTC: 65000,
  ETH: 3500,
  USDT: 1,
};

const FEE_RATE = 0.001; // 0.10%

type ActionTab = "buy" | "sell" | "convert";

function isFiat(asset: string): boolean {
  return FIAT.includes(asset as any);
}

function isCrypto(asset: string): boolean {
  return CRYPTO.includes(asset as any);
}

function priceInZAR(asset: string): number {
  if (asset === "ZAR") return 1;
  if (isFiat(asset)) return FX_ZAR_PER[asset as keyof typeof FX_ZAR_PER] ?? 1;
  const usd = USD_PRICES[asset as keyof typeof USD_PRICES] ?? 0;
  return usd * FX_ZAR_PER.USD;
}

function formatAmount(asset: string, amount: number): string {
  if (!Number.isFinite(amount)) return "–";
  if (isFiat(asset)) return amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  if (asset === "BTC") return amount.toLocaleString(undefined, { maximumFractionDigits: 6 });
  if (asset === "ETH") return amount.toLocaleString(undefined, { maximumFractionDigits: 5 });
  return amount.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function calculateQuote(from: string, to: string, fromAmount: number) {
  const fromPrice = priceInZAR(from);
  const toPrice = priceInZAR(to);
  
  if (!fromPrice || !toPrice || !Number.isFinite(fromAmount) || fromAmount <= 0) {
    return { toAmount: 0, rate: 0, fee: 0 };
  }
  
  const grossTo = (fromAmount * fromPrice) / toPrice;
  const fee = grossTo * FEE_RATE;
  const netTo = Math.max(grossTo - fee, 0);
  const rate = fromPrice / toPrice;
  
  return { toAmount: netTo, rate, fee };
}

export function TradingPanel({ onPairChange }: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>("buy");
  
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

  // Calculate quotes
  const buyQuote = useMemo(() => 
    calculateQuote(fromBuy, toBuy, parseFloat(amountBuy) || 0), 
    [fromBuy, toBuy, amountBuy]
  );
  
  const sellQuote = useMemo(() => 
    calculateQuote(fromSell, toSell, parseFloat(amountSell) || 0), 
    [fromSell, toSell, amountSell]
  );
  
  const convertQuote = useMemo(() => 
    calculateQuote(fromConvert, toConvert, parseFloat(amountConvert) || 0), 
    [fromConvert, toConvert, amountConvert]
  );

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
                    {FIAT.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {currency === "ZAR" ? "South African Rand" : 
                                    currency === "USD" ? "US Dollar" :
                                    currency === "EUR" ? "Euro" : "British Pound"}
                      </SelectItem>
                    ))}
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
                    {CRYPTO.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {currency === "BTC" ? "Bitcoin" : 
                                      currency === "ETH" ? "Ethereum" : "Tether"}
                      </SelectItem>
                    ))}
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
                disabled={!amountBuy || parseFloat(amountBuy) <= 0}
                data-testid="button-preview-buy"
              >
                Preview Buy Order
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
                    {CRYPTO.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {currency === "BTC" ? "Bitcoin" : 
                                      currency === "ETH" ? "Ethereum" : "Tether"}
                      </SelectItem>
                    ))}
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
                    {FIAT.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency} - {currency === "ZAR" ? "South African Rand" : 
                                    currency === "USD" ? "US Dollar" :
                                    currency === "EUR" ? "Euro" : "British Pound"}
                      </SelectItem>
                    ))}
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
                disabled={!amountSell || parseFloat(amountSell) <= 0}
                data-testid="button-preview-sell"
              >
                Preview Sell Order
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
                    {ALL_ASSETS.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
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
                    {ALL_ASSETS.filter(a => a !== fromConvert).map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
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
                disabled={!amountConvert || parseFloat(amountConvert) <= 0}
                data-testid="button-preview-convert"
              >
                Preview Convert
              </Button>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="border-t border-border p-4">
          <h3 className="text-sm font-semibold mb-3">Recent Activity</h3>
          <div className="space-y-3 max-h-40 overflow-y-auto">
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">Bought BTC</div>
                <div className="text-xs text-muted-foreground">2 hours ago</div>
              </div>
              <div className="text-right">
                <div className="font-mono">0.00083 BTC</div>
                <div className="text-xs text-muted-foreground">R1,000</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div>
                <div className="font-medium">Sold ETH</div>
                <div className="text-xs text-muted-foreground">1 day ago</div>
              </div>
              <div className="text-right">
                <div className="font-mono">0.5 ETH</div>
                <div className="text-xs text-muted-foreground">R32,375</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
