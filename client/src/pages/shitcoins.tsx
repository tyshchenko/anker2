import { useState } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, TrendingUp, TrendingDown, Copy, CheckCircle, AlertTriangle, Wallet, Link as LinkIcon, Globe, Shield, Flame, Zap, Sparkles } from "lucide-react";

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

const POPULAR_WALLETS = [
  {
    name: "Phantom",
    description: "The most popular Solana wallet",
    icon: "👻",
    color: "bg-purple-600",
    url: "https://phantom.app/",
    supported: ["SOL", "SPL"],
    users: "7M+"
  },
  {
    name: "MetaMask",
    description: "Leading Ethereum wallet",
    icon: "🦊",
    color: "bg-orange-500",
    url: "https://metamask.io/",
    supported: ["ETH", "ERC-20"],
    users: "30M+"
  },
  {
    name: "Trust Wallet",
    description: "Multi-chain mobile wallet",
    icon: "🛡️",
    color: "bg-blue-600",
    url: "https://trustwallet.com/",
    supported: ["Multi-chain"],
    users: "25M+"
  },
  {
    name: "Coinbase Wallet",
    description: "Self-custody wallet by Coinbase",
    icon: "💼",
    color: "bg-blue-500",
    url: "https://wallet.coinbase.com/",
    supported: ["ETH", "SOL", "BTC"],
    users: "10M+"
  },
  {
    name: "Solflare",
    description: "Native Solana wallet",
    icon: "☀️",
    color: "bg-yellow-500",
    url: "https://solflare.com/",
    supported: ["SOL", "SPL"],
    users: "1M+"
  },
  {
    name: "Rainbow",
    description: "Ethereum wallet with NFT focus",
    icon: "🌈",
    color: "bg-gradient-to-r from-purple-500 to-pink-500",
    url: "https://rainbow.me/",
    supported: ["ETH", "ERC-20", "NFTs"],
    users: "2M+"
  }
];

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
  },
  {
    address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM",
    symbol: "BONK",
    name: "Bonk",
    decimals: 5,
    price: 0.0000234,
    change24h: 45.67,
    volume24h: 23456789,
    marketCap: 1234567890,
    verified: false
  },
  {
    address: "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
    symbol: "SAMO",
    name: "Samoyedcoin",
    decimals: 9,
    price: 0.0234,
    change24h: -12.34,
    volume24h: 3456789,
    marketCap: 234567890,
    verified: false
  }
];

interface WalletCardProps {
  wallet: typeof POPULAR_WALLETS[0];
  onConnect: (walletName: string) => void;
  isConnected: boolean;
}

function WalletCard({ wallet, onConnect, isConnected }: WalletCardProps) {
  return (
    <Card className="p-4 hover:shadow-lg transition-all border-2 hover:border-primary/20">
      <div className="flex items-center space-x-3 mb-3">
        <div className={`w-12 h-12 rounded-full ${wallet.color} flex items-center justify-center text-xl`}>
          {wallet.icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold">{wallet.name}</h3>
            <Badge variant="outline" className="text-xs">
              {wallet.users}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{wallet.description}</p>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-1 mb-3">
        {wallet.supported.map((chain) => (
          <Badge key={chain} variant="secondary" className="text-xs">
            {chain}
          </Badge>
        ))}
      </div>
      
      <div className="flex space-x-2">
        <Button
          onClick={() => onConnect(wallet.name)}
          disabled={isConnected}
          className={`flex-1 ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
          data-testid={`connect-${wallet.name.toLowerCase()}`}
        >
          {isConnected ? (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Connected
            </>
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect
            </>
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          onClick={() => window.open(wallet.url, '_blank')}
          data-testid={`visit-${wallet.name.toLowerCase()}`}
        >
          <ExternalLink className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

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

  const getPriceDisplay = () => {
    if (!token.price) return 'N/A';
    if (token.price < 0.01) return `$${token.price.toFixed(6)}`;
    return `$${token.price.toFixed(2)}`;
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-all border-2 hover:border-primary/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-primary/10 to-transparent rounded-bl-full" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-full flex items-center justify-center relative">
            <span className="text-primary font-bold text-lg">
              {token.symbol?.charAt(0) || '?'}
            </span>
            {!token.verified && (
              <div className="absolute -top-1 -right-1">
                <Flame className="w-4 h-4 text-orange-500" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-lg" data-testid={`token-symbol-${token.symbol}`}>
                {token.symbol}
              </h3>
              {token.verified ? (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                  <Shield className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs">
                  <Flame className="w-3 h-3 mr-1" />
                  DEGEN
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
            <span className="font-semibold">
              {token.change24h >= 0 ? '+' : ''}{token.change24h.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <Label className="text-xs text-muted-foreground">Price</Label>
          <p className="font-mono font-semibold" data-testid={`token-price-${token.symbol}`}>
            {getPriceDisplay()}
          </p>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Market Cap</Label>
          <p className="font-semibold" data-testid={`token-mcap-${token.symbol}`}>
            {token.marketCap ? formatNumber(token.marketCap) : 'N/A'}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Label className="text-xs text-muted-foreground">Contract Address</Label>
        <div className="flex items-center space-x-2 mt-1">
          <code className="flex-1 text-xs bg-muted px-2 py-1 rounded font-mono truncate">
            {token.address}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={copyAddress}
            className="shrink-0"
            data-testid={`copy-address-${token.symbol}`}
          >
            {copied ? (
              <CheckCircle className="w-3 h-3 text-green-600" />
            ) : (
              <Copy className="w-3 h-3" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex space-x-2">
        <Button 
          onClick={openJupiter}
          className="flex-1 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
          data-testid={`jupiter-trade-${token.symbol}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Trade on Jupiter
        </Button>
        <Button
          variant="outline"
          onClick={() => onTrade(token)}
          data-testid={`quick-trade-${token.symbol}`}
        >
          <Zap className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}

export default function ShitcoinsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [showWallets, setShowWallets] = useState(true);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    // Simulate API call delay
    setTimeout(() => {
      const filtered = MOCK_RESULTS.filter(token =>
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      
      setResults(filtered);
      setIsSearching(false);
    }, 1000);
  };

  const handleConnectWallet = (walletName: string) => {
    // Simulate wallet connection
    setConnectedWallet(walletName);
    console.log(`Connecting to ${walletName}...`);
  };

  const handleTrade = (token: TokenResult) => {
    setSelectedToken(token);
    console.log('Trading:', token);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
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

          {/* Hero Header */}
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-primary/10">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                <Flame className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  DeFi Portal
                </h1>
                <p className="text-muted-foreground">
                  Discover, trade, and manage tokens across multiple chains
                </p>
              </div>
            </div>

            {/* Search Bar */}
            <div className="flex space-x-3 max-w-2xl">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by token symbol, name, or contract address..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10 h-12 text-base"
                  data-testid="token-search"
                />
              </div>
              <Button 
                onClick={handleSearch}
                disabled={isSearching || !searchQuery.trim()}
                className="h-12 px-6"
                data-testid="search-button"
              >
                {isSearching ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {/* Wallet Connection Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
                  {connectedWallet && (
                    <Badge className="bg-green-100 text-green-700">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      {connectedWallet} Connected
                    </Badge>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWallets(!showWallets)}
                  data-testid="toggle-wallets"
                >
                  {showWallets ? 'Hide' : 'Show'} Wallets
                </Button>
              </div>
              
              {showWallets && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {POPULAR_WALLETS.map((wallet) => (
                    <WalletCard
                      key={wallet.name}
                      wallet={wallet}
                      onConnect={handleConnectWallet}
                      isConnected={connectedWallet === wallet.name}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Search Results */}
            {results.length > 0 && (
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-4">
                  <Search className="w-5 h-5 text-primary" />
                  <h2 className="text-xl font-semibold">Search Results</h2>
                  <Badge variant="secondary">{results.length} tokens found</Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {results.map((token) => (
                    <TokenCard
                      key={token.address}
                      token={token}
                      onTrade={handleTrade}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Trending Tokens */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Trending Tokens</h2>
                <Badge variant="secondary">🔥 Hot</Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {MOCK_RESULTS.map((token) => (
                  <TokenCard
                    key={token.address}
                    token={token}
                    onTrade={handleTrade}
                  />
                ))}
              </div>
            </div>

            {/* DeFi Notice */}
            <div className="mt-8 bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-yellow-800">DeFi Trading Notice</h3>
                  <p className="text-sm text-yellow-700 mt-1">
                    Trading unverified tokens carries high risk. Always DYOR (Do Your Own Research) before investing. 
                    Never invest more than you can afford to lose. This is not financial advice.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}