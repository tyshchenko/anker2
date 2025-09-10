import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";
import xrpLogo from "@assets/XRP_1757408614597.png";
import bnbLogo from "@assets/BNB_1757408614597.png";
import dogeLogo from "@assets/Dogecoin_1757409584282.png";
import solLogo from "@assets/SOL_1757408614598.png";
import polygonLogo from "@assets/Polygon_1757409292577.png";
import cardanoLogo from "@assets/Cardano_1757409292578.png";

// Market data interface
interface MarketData {
  pair: string;
  price: string;
  change_24h: string;
  volume_24h: string;
  timestamp: string;
}

interface TokenData {
  id: string;
  symbol: string;
  name: string;
  price: number; // USD price
  change: number;
  marketCap: string;
  icon: string;
  logoUrl?: string;
  priceInZAR?: number; // ZAR price from API
}

// Static token metadata (logos, names, icons)
const TOKEN_METADATA: Record<string, { name: string; icon: string; logoUrl?: string }> = {
  'BTC': { name: 'Bitcoin', icon: '₿', logoUrl: btcLogo },
  'ETH': { name: 'Ethereum', icon: 'Ξ', logoUrl: ethLogo },
  'USDT': { name: 'Tether', icon: '₮', logoUrl: usdtLogo },
  'BNB': { name: 'BNB', icon: 'B', logoUrl: bnbLogo },
  'SOL': { name: 'Solana', icon: 'S', logoUrl: solLogo },
  'USDC': { name: 'USD Coin', icon: 'C' },
  'XRP': { name: 'XRP', icon: 'X', logoUrl: xrpLogo },
  'DOGE': { name: 'Dogecoin', icon: 'D', logoUrl: dogeLogo },
  'ADA': { name: 'Cardano', icon: 'A', logoUrl: cardanoLogo },
  'AVAX': { name: 'Avalanche', icon: 'V' },
  'LINK': { name: 'Chainlink', icon: 'L' },
  'DOT': { name: 'Polkadot', icon: 'P' },
  'MATIC': { name: 'Polygon', icon: 'M', logoUrl: polygonLogo },
  'UNI': { name: 'Uniswap', icon: 'U' },
  'LTC': { name: 'Litecoin', icon: 'Ł' },
  'NEAR': { name: 'NEAR Protocol', icon: 'N' },
  'ARB': { name: 'Arbitrum', icon: 'R' },
  'OP': { name: 'Optimism', icon: 'O' },
  'ATOM': { name: 'Cosmos', icon: 'T' },
  'APT': { name: 'Aptos', icon: 'PT' }
};

const FIAT_CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];

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

interface TokenCardProps {
  token: TokenData;
  isSelected: boolean;
  onClick: () => void;
  isAvailable: boolean;
  priceInZAR: number;
}

function TokenCard({ token, isSelected, onClick, isAvailable, priceInZAR }: TokenCardProps) {
  
  return (
    <div
      className={`
        relative p-4 rounded-lg border transition-all duration-200 overflow-hidden
        ${isAvailable 
          ? `cursor-pointer hover:shadow-md ${isSelected 
              ? 'border-primary bg-primary/5 shadow-md ring-2 ring-primary/20' 
              : 'border-border bg-card hover:border-primary/30'
            }`
          : 'border-border bg-card/50 cursor-not-allowed'
        }
      `}
      onClick={isAvailable ? onClick : undefined}
      data-testid={`token-card-${token.id}`}
    >
      {/* Coming Soon Overlay */}
      {!isAvailable && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-2">
              <span className="text-2xl">🚀</span>
            </div>
            <div className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
              Coming Soon
            </div>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            isAvailable 
              ? 'bg-white' 
              : 'bg-muted/50'
          }`}>
            {token.logoUrl && isAvailable ? (
              <img 
                src={token.logoUrl} 
                alt={`${token.symbol} logo`} 
                className="w-8 h-8 rounded-full object-contain"
              />
            ) : (
              <span className={`text-lg font-bold ${
                isAvailable 
                  ? 'text-primary' 
                  : 'text-muted-foreground'
              }`}>{token.icon}</span>
            )}
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${
              isAvailable ? '' : 'text-muted-foreground'
            }`} data-testid={`text-name-${token.id}`}>
              {token.name}
            </h3>
            <p className="text-xs text-muted-foreground" data-testid={`text-symbol-${token.id}`}>
              {token.symbol}
            </p>
          </div>
        </div>
        {isAvailable && (
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
        )}
      </div>
      
      <div className="space-y-2">
        <div>
          <p className="text-xs text-muted-foreground">Price (ZAR)</p>
          <p className={`font-mono text-sm font-semibold ${
            isAvailable ? '' : 'text-muted-foreground'
          }`} data-testid={`text-price-zar-${token.id}`}>
            R{priceInZAR.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Price (USD)</p>
          <p className={`font-mono text-xs ${
            isAvailable ? '' : 'text-muted-foreground'
          }`} data-testid={`text-price-usd-${token.id}`}>
            ${token.price.toLocaleString()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Volume (24h)</p>
          <p className={`text-xs font-medium ${
            isAvailable ? '' : 'text-muted-foreground'
          }`} data-testid={`text-volume-${token.id}`}>
            {token.marketCap}
          </p>
        </div>
      </div>
    </div>
  );
}

type ActionTab = "buy" | "sell" | "convert";

interface TradingPanelProps {
  selectedToken: TokenData | null;
  tokenPriceInZAR: number;
}

function TradingPanel({ selectedToken, tokenPriceInZAR }: TradingPanelProps) {
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
      return (inputAmount / tokenPriceInZAR).toFixed(6);
    } else if (activeTab === "sell") {
      // Selling token for fiat
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
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
              {selectedToken.logoUrl ? (
                <img 
                  src={selectedToken.logoUrl} 
                  alt={`${selectedToken.symbol} logo`} 
                  className="w-6 h-6 rounded-full object-contain"
                />
              ) : (
                <span className="text-sm font-bold text-primary">{selectedToken.icon}</span>
              )}
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
  const [selectedToken, setSelectedToken] = useState<TokenData | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  // Fetch real market data
  const { data: marketData, isLoading: marketLoading } = useMarketData();
  
  // Get USD/ZAR exchange rate (approximately 18.5 ZAR per 1 USD)
  const usdToZarRate = 18.5; // This could be made dynamic later
  
  // Convert market data to token format and determine available tokens
  const tokens: TokenData[] = marketData ? marketData.map((market, index) => {
    const [crypto, fiat] = market.pair.split('/');
    const metadata = TOKEN_METADATA[crypto] || { 
      name: crypto, 
      icon: crypto[0] 
    };
    
    // API returns prices in ZAR, calculate USD price
    const priceInZAR = parseFloat(market.price);
    const priceInUSD = priceInZAR / usdToZarRate;
    
    return {
      id: crypto.toLowerCase(),
      symbol: crypto,
      name: metadata.name,
      price: priceInUSD, // USD price for display
      change: parseFloat(market.change_24h),
      marketCap: `${parseFloat(market.volume_24h).toLocaleString()}`, // Using volume as market cap placeholder
      icon: metadata.icon,
      logoUrl: metadata.logoUrl,
      priceInZAR: priceInZAR // Add ZAR price for easy access
    };
  }).sort((a, b) => b.priceInZAR - a.priceInZAR) : []; // Sort by ZAR price, highest first

  // Find available trading pairs (those with actual market data)
  const availableTokens = tokens.filter(token => (token.priceInZAR || 0) > 0);
  const availableTokenIds = availableTokens.map(t => t.id);
  
  // Selected token price in ZAR is already available
  const selectedTokenPriceInZAR = selectedToken ? 
    (selectedToken.priceInZAR || 0) : 0;

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
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🌟</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Explore Cryptocurrencies</h1>
                  <p className="text-muted-foreground">
                    Discover and trade the top cryptocurrencies with ZAR pairs
                  </p>
                </div>
              </div>
              
              {/* Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {availableTokens.length} Available Now
                    </span>
                  </div>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    {availableTokens.map(t => t.symbol).join(', ')} ready to trade
                  </p>
                </div>
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      {tokens.length - availableTokens.length} Coming Soon
                    </span>
                  </div>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    More tokens launching shortly
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
                      ZAR Trading
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    All prices in South African Rand
                  </p>
                </div>
              </div>
            </div>

            {/* Token Grid */}
            <div className="flex-1 p-6">
              {marketLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading market data...</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                  {tokens.map((token) => {
                    const isAvailable = availableTokenIds.includes(token.id);
                    const priceInZAR = token.priceInZAR || 0;
                    return (
                      <TokenCard
                        key={token.id}
                        token={token}
                        isSelected={selectedToken?.id === token.id}
                        onClick={() => setSelectedToken(token)}
                        isAvailable={isAvailable}
                        priceInZAR={priceInZAR}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          </main>

          {/* Trading Panel */}
          <TradingPanel 
            selectedToken={selectedToken} 
            tokenPriceInZAR={selectedTokenPriceInZAR}
          />
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