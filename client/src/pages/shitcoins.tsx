import { useState } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, TrendingUp, TrendingDown, Copy, CheckCircle, AlertTriangle } from "lucide-react";

interface TokenResult {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  price?: number;
  change24h?: number;
  volume24h?: number;
  marketCap?: number;
  verified?: boolean;
}

// Mock search results for demonstration
const MOCK_RESULTS: TokenResult[] = [
  {
    address: "So11111111111111111111111111111111111111112",
    symbol: "SOL",
    name: "Wrapped SOL",
    decimals: 9,
    price: 142.56,
    change24h: 2.34,
    volume24h: 45672891,
    marketCap: 67890123456,
    verified: true
  },
  {
    address: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
    price: 1.0,
    change24h: 0.01,
    volume24h: 123456789,
    marketCap: 34567890123,
    verified: true
  },
  {
    address: "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R",
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
    price: 2.45,
    change24h: -1.23,
    volume24h: 8765432,
    marketCap: 456789012,
    verified: true
  }
];

interface TokenCardProps {
  token: TokenResult;
  onTrade: (token: TokenResult) => void;
}

function TokenCard({ token, onTrade }: TokenCardProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(token.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
    return `$${num.toFixed(2)}`;
  };

  const openJupiter = () => {
    const jupiterUrl = `https://jup.ag/swap/SOL-${token.address}`;
    window.open(jupiterUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center">
            <span className="text-primary font-bold text-lg">
              {token.symbol?.charAt(0) || '?'}
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg" data-testid={`token-symbol-${token.symbol}`}>
                {token.symbol}
              </h3>
              {token.verified && (
                <Badge variant="secondary" className="text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground" data-testid={`token-name-${token.symbol}`}>
              {token.name}
            </p>
          </div>
        </div>
        
        {token.change24h !== undefined && (
          <div className={`flex items-center space-x-1 ${
            token.change24h >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {token.change24h >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-medium">
              {token.change24h > 0 ? '+' : ''}{token.change24h.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="space-y-3 mb-4">
        {token.price !== undefined && (
          <div>
            <p className="text-sm text-muted-foreground">Price</p>
            <p className="text-xl font-bold" data-testid={`token-price-${token.symbol}`}>
              {formatNumber(token.price)}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          {token.volume24h !== undefined && (
            <div>
              <p className="text-muted-foreground">24h Volume</p>
              <p className="font-medium">{formatNumber(token.volume24h)}</p>
            </div>
          )}
          {token.marketCap !== undefined && (
            <div>
              <p className="text-muted-foreground">Market Cap</p>
              <p className="font-medium">{formatNumber(token.marketCap)}</p>
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted-foreground mb-1">Contract Address</p>
          <div className="flex items-center space-x-2">
            <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono">
              {`${token.address.slice(0, 8)}...${token.address.slice(-8)}`}
            </code>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyAddress}
              data-testid={`button-copy-${token.symbol}`}
            >
              {copied ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={openJupiter}
          data-testid={`button-jupiter-${token.symbol}`}
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          Trade on Jupiter
        </Button>
        <Button
          className="flex-1"
          onClick={() => onTrade(token)}
          data-testid={`button-trade-${token.symbol}`}
        >
          Quick Trade
        </Button>
      </div>
    </Card>
  );
}

export default function ShitcoinsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TokenResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError('');
    
    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For demo purposes, filter mock results or show all if searching for common terms
      if (searchQuery.toLowerCase().includes('sol') || 
          searchQuery.toLowerCase().includes('usdc') || 
          searchQuery.toLowerCase().includes('ray') ||
          searchQuery.length > 30) { // Assume it's a contract address
        setSearchResults(MOCK_RESULTS);
      } else {
        setSearchResults([]);
        setSearchError('No tokens found for this search. Try a different contract address or token symbol.');
      }
    } catch (error) {
      setSearchError('Failed to search tokens. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const handleTrade = (token: TokenResult) => {
    // This would integrate with the trading panel
    console.log('Trading token:', token);
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
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Market Ticker */}
          <MarketTicker />

          {/* Page Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                <Search className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Shitcoins</h1>
                <p className="text-muted-foreground">
                  Search and trade any Solana token via Jupiter
                </p>
              </div>
            </div>
          </div>

          {/* Search Section */}
          <div className="p-6 border-b border-border">
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="search">Search Token</Label>
                  <div className="flex space-x-3 mt-1">
                    <Input
                      id="search"
                      type="text"
                      placeholder="Enter contract address, symbol, or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="flex-1"
                      data-testid="input-search"
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !searchQuery.trim()}
                      data-testid="button-search"
                    >
                      {isSearching ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Search className="w-4 h-4" />
                      )}
                      {isSearching ? 'Searching...' : 'Search'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Search by contract address for best results. Example: So11111111111111111111111111111111111111112
                  </p>
                </div>

                {searchError && (
                  <div className="flex items-center space-x-2 text-destructive">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="text-sm">{searchError}</span>
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Search Results */}
          <div className="flex-1 p-6">
            {searchResults.length > 0 ? (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold">
                  Search Results ({searchResults.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {searchResults.map((token) => (
                    <TokenCard
                      key={token.address}
                      token={token}
                      onTrade={handleTrade}
                    />
                  ))}
                </div>
              </div>
            ) : !isSearching && !searchError && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Find Any Solana Token</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Search for any token on Solana by contract address, symbol, or name. 
                  Connect directly to Jupiter for seamless trading.
                </p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}