import { useState } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { BalanceDisplay } from "@/components/exchange/balance-display";
import { DepositModal } from "@/components/exchange/deposit-modal";
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

// Top 20 tokens data
const TOP_TOKENS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', price: 65000, change: 2.34, marketCap: '1.2T', icon: '₿' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', price: 3500, change: -1.25, marketCap: '420B', icon: 'Ξ' },
  { id: 'tether', symbol: 'USDT', name: 'Tether', price: 1.00, change: 0.01, marketCap: '95B', icon: '₮' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB', price: 620, change: 3.45, marketCap: '95B', icon: 'B' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', price: 155, change: 5.67, marketCap: '70B', icon: 'S' },
  { id: 'usd-coin', symbol: 'USDC', name: 'USD Coin', price: 1.00, change: 0.02, marketCap: '32B', icon: 'C' },
  { id: 'xrp', symbol: 'XRP', name: 'XRP', price: 0.62, change: -2.15, marketCap: '35B', icon: 'X' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', price: 0.38, change: 8.92, marketCap: '55B', icon: 'D' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano', price: 1.25, change: 1.84, marketCap: '44B', icon: 'A' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', price: 42, change: -0.85, marketCap: '16B', icon: 'V' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', price: 14.5, change: 4.23, marketCap: '8.5B', icon: 'L' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', price: 7.8, change: -3.12, marketCap: '11B', icon: 'P' },
  { id: 'polygon', symbol: 'MATIC', name: 'Polygon', price: 1.15, change: 2.67, marketCap: '11B', icon: 'M' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', price: 9.2, change: -1.44, marketCap: '5.5B', icon: 'U' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin', price: 95, change: 0.78, marketCap: '7B', icon: 'Ł' },
  { id: 'near', symbol: 'NEAR', name: 'NEAR Protocol', price: 5.4, change: 6.21, marketCap: '5.9B', icon: 'N' },
  { id: 'arbitrum', symbol: 'ARB', name: 'Arbitrum', price: 2.1, change: -2.33, marketCap: '2.8B', icon: 'R' },
  { id: 'optimism', symbol: 'OP', name: 'Optimism', price: 3.8, change: 1.95, marketCap: '3.2B', icon: 'O' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos', price: 12.5, change: -0.56, marketCap: '4.9B', icon: 'T' },
  { id: 'aptos', symbol: 'APT', name: 'Aptos', price: 11.8, change: 4.12, marketCap: '4.1B', icon: 'PT' }
];

const FIAT_CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];

interface TokenCardProps {
  token: typeof TOP_TOKENS[0];
  isSelected: boolean;
  onClick: () => void;
}

function TokenCard({ token, isSelected, onClick }: TokenCardProps) {
  const priceInZAR = token.price * 18.5; // Convert USD to ZAR
  
  return (
    <div
      className={`
        p-4 rounded-lg border cursor-pointer transition-all duration-200 hover:shadow-md
        ${isSelected 
          ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
          : 'border-border bg-card hover:border-primary/30'
        }
      `}
      onClick={onClick}
      data-testid={`token-card-${token.id}`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-bold text-primary">{token.icon}</span>
          </div>
          <div>
            <h3 className="font-semibold text-sm" data-testid={`text-name-${token.id}`}>
              {token.name}
            </h3>
            <p className="text-xs text-muted-foreground" data-testid={`text-symbol-${token.id}`}>
              {token.symbol}
            </p>
          </div>
        </div>
        <div 
          className={`
            text-xs font-medium px-2 py-1 rounded-full
            ${token.change >= 0 
              ? 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30' 
              : 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30'
            }
          `}
          data-testid={`text-change-${token.id}`}
        >
          {token.change >= 0 ? '+' : ''}{token.change.toFixed(2)}%
        </div>
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Price (ZAR)</p>
          <p className="font-mono text-sm font-semibold" data-testid={`text-price-zar-${token.id}`}>
            R{priceInZAR.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Price (USD)</p>
          <p className="font-mono text-xs" data-testid={`text-price-usd-${token.id}`}>
            ${token.price.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Market Cap</p>
          <p className="text-xs font-medium" data-testid={`text-marketcap-${token.id}`}>
            {token.marketCap}
          </p>
        </div>
      </div>
    </div>
  );
}

type ActionTab = "buy" | "sell" | "convert";

interface TradingPanelProps {
  selectedToken: typeof TOP_TOKENS[0] | null;
}

function TradingPanel({ selectedToken }: TradingPanelProps) {
  const [activeTab, setActiveTab] = useState<ActionTab>("buy");
  const [fromCurrency, setFromCurrency] = useState("ZAR");
  const [toCurrency, setToCurrency] = useState("USD");
  const [amount, setAmount] = useState("");

  if (!selectedToken) {
    return (
      <aside className="w-full lg:w-96 bg-card border-l border-border trading-panel">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-semibold mb-2">Select a Token</h3>
          <p className="text-sm text-muted-foreground">
            Click on any token from the list to start trading
          </p>
        </div>
      </aside>
    );
  }

  const TabButton = ({ tab, label }: { tab: ActionTab; label: string }) => (
    <Button
      variant={activeTab === tab ? "default" : "ghost"}
      size="sm"
      className="flex-1"
      onClick={() => setActiveTab(tab)}
      data-testid={`tab-${tab}`}
    >
      {label}
    </Button>
  );

  const calculateAmount = () => {
    if (!amount || isNaN(parseFloat(amount))) return "0.00";
    const inputAmount = parseFloat(amount);
    
    if (activeTab === "buy") {
      // Buying token with fiat
      const tokenPriceInZAR = selectedToken.price * 18.5;
      return (inputAmount / tokenPriceInZAR).toFixed(6);
    } else if (activeTab === "sell") {
      // Selling token for fiat
      const tokenPriceInZAR = selectedToken.price * 18.5;
      return (inputAmount * tokenPriceInZAR).toFixed(2);
    }
    
    return "0.00";
  };

  return (
    <aside className="w-full lg:w-96 bg-card border-l border-border trading-panel">
      <div className="h-full flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-sm font-bold text-primary">{selectedToken.icon}</span>
            </div>
            <div>
              <h3 className="font-semibold">{selectedToken.name}</h3>
              <p className="text-xs text-muted-foreground">{selectedToken.symbol}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-1 p-1 bg-muted rounded-lg">
            <TabButton tab="buy" label="Buy" />
            <TabButton tab="sell" label="Sell" />
            <TabButton tab="convert" label="Convert" />
          </div>
        </div>

        {/* Trading Form */}
        <div className="flex-1 p-4 space-y-4">
          {activeTab === "buy" && (
            <div className="space-y-4" data-testid="form-buy">
              <div>
                <Label>Pay with</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger data-testid="select-pay-with">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIAT_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Amount ({fromCurrency})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-amount"
                />
              </div>
              
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>You receive</span>
                  <span className="font-mono" data-testid="text-receive-amount">
                    {calculateAmount()} {selectedToken.symbol}
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                disabled={!amount || parseFloat(amount) <= 0}
                data-testid="button-buy"
              >
                Buy {selectedToken.symbol}
              </Button>
            </div>
          )}

          {activeTab === "sell" && (
            <div className="space-y-4" data-testid="form-sell">
              <div>
                <Label>Amount ({selectedToken.symbol})</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-amount-sell"
                />
              </div>
              
              <div>
                <Label>Receive</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger data-testid="select-receive">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FIAT_CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>
                        {currency}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>You receive</span>
                  <span className="font-mono" data-testid="text-sell-amount">
                    R{calculateAmount()}
                  </span>
                </div>
              </div>
              
              <Button 
                variant="destructive"
                className="w-full" 
                size="lg"
                disabled={!amount || parseFloat(amount) <= 0}
                data-testid="button-sell"
              >
                Sell {selectedToken.symbol}
              </Button>
            </div>
          )}

          {activeTab === "convert" && (
            <div className="space-y-4" data-testid="form-convert">
              <div>
                <Label>From</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  placeholder="0.000000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                  data-testid="input-convert-amount"
                />
                <p className="text-xs text-muted-foreground mt-1">{selectedToken.symbol}</p>
              </div>
              
              <div className="bg-muted rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span>Estimated value</span>
                  <span className="font-mono" data-testid="text-convert-value">
                    R{calculateAmount()}
                  </span>
                </div>
              </div>
              
              <Button 
                className="w-full" 
                size="lg"
                disabled={!amount || parseFloat(amount) <= 0}
                data-testid="button-convert"
              >
                Convert {selectedToken.symbol}
              </Button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

export default function ExplorePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedToken, setSelectedToken] = useState<typeof TOP_TOKENS[0] | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sidebar
          isMobile
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
          {/* Center Panel - Token Grid */}
          <main className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <MobileHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              onDepositClick={handleDepositClick}
            />

            {/* Desktop Balance Display */}
            <BalanceDisplay 
              variant="desktop" 
              onDepositClick={handleDepositClick}
            />

            {/* Market Ticker */}
            <MarketTicker />

            {/* Page Header */}
            <div className="p-6 border-b border-border">
              <h1 className="text-2xl font-bold mb-2">Explore Tokens</h1>
              <p className="text-muted-foreground">
                Discover and trade the top 20 cryptocurrencies
              </p>
            </div>

            {/* Token Grid */}
            <div className="flex-1 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                {TOP_TOKENS.map((token) => (
                  <TokenCard
                    key={token.id}
                    token={token}
                    isSelected={selectedToken?.id === token.id}
                    onClick={() => setSelectedToken(token)}
                  />
                ))}
              </div>
            </div>
          </main>

          {/* Trading Panel */}
          <TradingPanel selectedToken={selectedToken} />
        </div>
        
        {/* Deposit Modal */}
        <DepositModal 
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
      </div>
    </div>
  );
}