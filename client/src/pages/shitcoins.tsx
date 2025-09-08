import { useState, useEffect } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, ExternalLink, TrendingUp, TrendingDown, Copy, CheckCircle, AlertTriangle, Wallet, Link as LinkIcon, Globe, Shield, Flame, Zap, Sparkles, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";

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
  onDisconnect?: () => void;
  isConnected: boolean;
  walletInfo?: {
    address?: string | null;
    balance?: string | null;
    isConnecting?: boolean;
  };
}

function WalletCard({ wallet, onConnect, onDisconnect, isConnected, walletInfo }: WalletCardProps) {
  const isMetaMask = wallet.name === "MetaMask";
  const isConnecting = walletInfo?.isConnecting || false;

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
          
          {/* Show wallet address and balance for connected MetaMask */}
          {isConnected && isMetaMask && walletInfo?.address && (
            <div className="mt-2 space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-muted-foreground">Address:</span>
                <code className="text-xs bg-muted px-1 rounded">
                  {walletInfo.address.slice(0, 6)}...{walletInfo.address.slice(-4)}
                </code>
              </div>
              {walletInfo.balance && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">Balance:</span>
                  <span className="text-xs font-mono">
                    {parseFloat(walletInfo.balance).toFixed(4)} {
                      (wallet.name === 'MetaMask' || 
                       wallet.name === 'Coinbase Wallet' || 
                       wallet.name === 'Trust Wallet' || 
                       wallet.name === 'Rainbow') ? 'ETH' : 'SOL'
                    }
                  </span>
                </div>
              )}
            </div>
          )}
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
        {isConnected && isMetaMask ? (
          <Button
            onClick={onDisconnect}
            variant="outline"
            className="flex-1"
            data-testid={`disconnect-${wallet.name.toLowerCase()}`}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        ) : (
          <Button
            onClick={() => onConnect(wallet.name)}
            disabled={isConnected || isConnecting}
            className={`flex-1 ${isConnected ? 'bg-green-600 hover:bg-green-700' : ''}`}
            data-testid={`connect-${wallet.name.toLowerCase()}`}
          >
            {isConnecting ? (
              <>
                <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-transparent border-t-current" />
                Connecting...
              </>
            ) : isConnected ? (
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
        )}
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

// Wallet types
declare global {
  interface Window {
    ethereum?: any;
    solana?: any;
    coinbaseWalletExtension?: any;
    trustwallet?: any;
    solflare?: any;
    rainbow?: any;
  }
}

// Wallet detection utilities
const detectWalletAvailability = () => {
  return {
    metamask: typeof window !== 'undefined' && !!window.ethereum && !!window.ethereum.isMetaMask,
    phantom: typeof window !== 'undefined' && !!window.solana && !!window.solana.isPhantom,
    coinbase: typeof window !== 'undefined' && (
      !!window.coinbaseWalletExtension || 
      (!!window.ethereum && !!window.ethereum.isCoinbaseWallet)
    ),
    trustwallet: typeof window !== 'undefined' && (
      !!window.trustwallet || 
      (!!window.ethereum && !!window.ethereum.isTrust)
    ),
    solflare: typeof window !== 'undefined' && !!window.solflare && !!window.solflare.isSolflare,
    rainbow: typeof window !== 'undefined' && (
      !!window.rainbow || 
      (!!window.ethereum && !!window.ethereum.isRainbow)
    ),
  };
};

interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  chainId: string | null;
  isConnecting: boolean;
  walletType: string | null;
}

interface PhantomWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
}

interface CoinbaseWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
}

interface TrustWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
}

interface SolflareWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
}

interface RainbowWalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
}

export default function ShitcoinsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<TokenResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedToken, setSelectedToken] = useState<TokenResult | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<string | null>(() => {
    // Load connected wallet from localStorage on initialization
    if (typeof window !== 'undefined') {
      return localStorage.getItem('connectedWallet');
    }
    return null;
  });
  const [showWallets, setShowWallets] = useState(true);
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    chainId: null,
    isConnecting: false,
    walletType: null,
  });
  const [phantomState, setPhantomState] = useState<PhantomWalletState>({
    isConnected: false,
    address: null,
    balance: null,
    isConnecting: false,
  });
  const [coinbaseState, setCoinbaseState] = useState<CoinbaseWalletState>({
    isConnected: false,
    address: null,
    balance: null,
    isConnecting: false,
  });
  const [trustWalletState, setTrustWalletState] = useState<TrustWalletState>({
    isConnected: false,
    address: null,
    balance: null,
    isConnecting: false,
  });
  const [solflareState, setSolflareState] = useState<SolflareWalletState>({
    isConnected: false,
    address: null,
    balance: null,
    isConnecting: false,
  });
  const [rainbowState, setRainbowState] = useState<RainbowWalletState>({
    isConnected: false,
    address: null,
    balance: null,
    isConnecting: false,
  });
  const { toast } = useToast();

  // Sync connected wallet to localStorage whenever it changes
  useEffect(() => {
    if (connectedWallet) {
      localStorage.setItem('connectedWallet', connectedWallet);
    }
  }, [connectedWallet]);

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

  // MetaMask connection functions
  const connectMetaMask = async () => {
    if (!window.ethereum) {
      toast({
        title: "MetaMask Not Found",
        description: "Please install MetaMask to connect your wallet",
        variant: "destructive",
      });
      return;
    }

    setWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);
      const network = await provider.getNetwork();

      setWalletState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        chainId: network.chainId.toString(),
        isConnecting: false,
        walletType: "MetaMask",
      });

      setConnectedWallet("MetaMask");

      toast({
        title: "Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("MetaMask connection error:", error);
      setWalletState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to MetaMask",
        variant: "destructive",
      });
    }
  };

  // Phantom connection functions
  const connectPhantom = async () => {
    if (!window.solana || !window.solana.isPhantom) {
      toast({
        title: "Phantom Not Found",
        description: "Please install Phantom wallet to connect",
        variant: "destructive",
      });
      return;
    }

    setPhantomState(prev => ({ ...prev, isConnecting: true }));

    try {
      const response = await window.solana.connect();
      const address = response.publicKey.toString();

      // Get real SOL balance using Solana Web3.js
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);

      setPhantomState({
        isConnected: true,
        address,
        balance: solBalance,
        isConnecting: false,
      });

      setConnectedWallet("Phantom");

      toast({
        title: "Phantom Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Phantom connection error:", error);
      setPhantomState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Phantom",
        variant: "destructive",
      });
    }
  };

  // Coinbase Wallet connection functions
  const connectCoinbase = async () => {
    // Check for Coinbase Wallet extension first
    if (window.coinbaseWalletExtension) {
      return connectCoinbaseExtension();
    }

    // Check if Coinbase Wallet is available through ethereum provider
    if (window.ethereum && window.ethereum.isCoinbaseWallet) {
      return connectCoinbaseEthereum();
    }

    // If neither is available, show install message
    toast({
      title: "Coinbase Wallet Not Found",
      description: "Please install Coinbase Wallet to connect",
      variant: "destructive",
    });
  };

  const connectCoinbaseExtension = async () => {
    setCoinbaseState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.coinbaseWalletExtension.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.coinbaseWalletExtension);
      const balance = await provider.getBalance(address);

      setCoinbaseState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Coinbase Wallet");

      toast({
        title: "Coinbase Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Coinbase Wallet connection error:", error);
      setCoinbaseState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Coinbase Wallet",
        variant: "destructive",
      });
    }
  };

  const connectCoinbaseEthereum = async () => {
    setCoinbaseState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);

      setCoinbaseState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Coinbase Wallet");

      toast({
        title: "Coinbase Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Coinbase Wallet connection error:", error);
      setCoinbaseState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Coinbase Wallet",
        variant: "destructive",
      });
    }
  };

  // Trust Wallet connection functions
  const connectTrustWallet = async () => {
    // Check if Trust Wallet is available through ethereum provider
    if (window.ethereum && window.ethereum.isTrust) {
      return connectTrustWalletEthereum();
    }

    // Check for Trust Wallet extension
    if (window.trustwallet) {
      return connectTrustWalletExtension();
    }

    toast({
      title: "Trust Wallet Not Found",
      description: "Please install Trust Wallet to connect",
      variant: "destructive",
    });
  };

  const connectTrustWalletEthereum = async () => {
    setTrustWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);

      setTrustWalletState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Trust Wallet");

      toast({
        title: "Trust Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Trust Wallet connection error:", error);
      setTrustWalletState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Trust Wallet",
        variant: "destructive",
      });
    }
  };

  const connectTrustWalletExtension = async () => {
    setTrustWalletState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.trustwallet.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.trustwallet);
      const balance = await provider.getBalance(address);

      setTrustWalletState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Trust Wallet");

      toast({
        title: "Trust Wallet Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Trust Wallet connection error:", error);
      setTrustWalletState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Trust Wallet",
        variant: "destructive",
      });
    }
  };

  // Solflare connection functions
  const connectSolflare = async () => {
    if (!window.solflare || !window.solflare.isSolflare) {
      toast({
        title: "Solflare Not Found",
        description: "Please install Solflare wallet to connect",
        variant: "destructive",
      });
      return;
    }

    setSolflareState(prev => ({ ...prev, isConnecting: true }));

    try {
      const response = await window.solflare.connect();
      const address = response.publicKey.toString();

      // Get real SOL balance using Solana Web3.js
      const connection = new Connection("https://api.mainnet-beta.solana.com");
      const publicKey = new PublicKey(address);
      const balance = await connection.getBalance(publicKey);
      const solBalance = (balance / LAMPORTS_PER_SOL).toFixed(4);

      setSolflareState({
        isConnected: true,
        address,
        balance: solBalance,
        isConnecting: false,
      });

      setConnectedWallet("Solflare");

      toast({
        title: "Solflare Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Solflare connection error:", error);
      setSolflareState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Solflare",
        variant: "destructive",
      });
    }
  };

  // Rainbow Wallet connection functions
  const connectRainbow = async () => {
    // Check if Rainbow is available through ethereum provider
    if (window.ethereum && window.ethereum.isRainbow) {
      return connectRainbowEthereum();
    }

    // Check for Rainbow extension
    if (window.rainbow) {
      return connectRainbowExtension();
    }

    toast({
      title: "Rainbow Not Found",
      description: "Please install Rainbow wallet to connect",
      variant: "destructive",
    });
  };

  const connectRainbowEthereum = async () => {
    setRainbowState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.ethereum);
      const balance = await provider.getBalance(address);

      setRainbowState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Rainbow");

      toast({
        title: "Rainbow Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Rainbow connection error:", error);
      setRainbowState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Rainbow",
        variant: "destructive",
      });
    }
  };

  const connectRainbowExtension = async () => {
    setRainbowState(prev => ({ ...prev, isConnecting: true }));

    try {
      const accounts = await window.rainbow.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const address = accounts[0];
      const provider = new ethers.BrowserProvider(window.rainbow);
      const balance = await provider.getBalance(address);

      setRainbowState({
        isConnected: true,
        address,
        balance: ethers.formatEther(balance),
        isConnecting: false,
      });

      setConnectedWallet("Rainbow");

      toast({
        title: "Rainbow Connected",
        description: `Connected to ${address.slice(0, 6)}...${address.slice(-4)}`,
      });

    } catch (error: any) {
      console.error("Rainbow connection error:", error);
      setRainbowState(prev => ({ ...prev, isConnecting: false }));
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Rainbow",
        variant: "destructive",
      });
    }
  };

  // Disconnect only the currently connected wallet
  const disconnectCurrentWallet = () => {
    if (!connectedWallet) return;

    switch (connectedWallet) {
      case "MetaMask":
        setWalletState({
          isConnected: false,
          address: null,
          balance: null,
          chainId: null,
          isConnecting: false,
          walletType: null,
        });
        break;
      case "Phantom":
        setPhantomState({
          isConnected: false,
          address: null,
          balance: null,
          isConnecting: false,
        });
        if (window.solana && window.solana.isConnected) {
          window.solana.disconnect();
        }
        break;
      case "Coinbase Wallet":
        setCoinbaseState({
          isConnected: false,
          address: null,
          balance: null,
          isConnecting: false,
        });
        break;
      case "Trust Wallet":
        setTrustWalletState({
          isConnected: false,
          address: null,
          balance: null,
          isConnecting: false,
        });
        break;
      case "Solflare":
        setSolflareState({
          isConnected: false,
          address: null,
          balance: null,
          isConnecting: false,
        });
        if (window.solflare && window.solflare.isConnected) {
          window.solflare.disconnect();
        }
        break;
      case "Rainbow":
        setRainbowState({
          isConnected: false,
          address: null,
          balance: null,
          isConnecting: false,
        });
        break;
    }

    setConnectedWallet(null);
    // Clear from localStorage
    localStorage.removeItem('connectedWallet');
  };

  // Disconnect all wallets (used for manual disconnect button)
  const disconnectWallet = () => {
    disconnectCurrentWallet();
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const handleConnectWallet = (walletName: string) => {
    // If another wallet is already connected, disconnect it first
    if (connectedWallet && connectedWallet !== walletName) {
      disconnectCurrentWallet();
    }

    if (walletName === "MetaMask") {
      connectMetaMask();
    } else if (walletName === "Phantom") {
      connectPhantom();
    } else if (walletName === "Coinbase Wallet") {
      connectCoinbase();
    } else if (walletName === "Trust Wallet") {
      connectTrustWallet();
    } else if (walletName === "Solflare") {
      connectSolflare();
    } else if (walletName === "Rainbow") {
      connectRainbow();
    } else {
      // For other wallets, use the original mock behavior
      setConnectedWallet(walletName);
      toast({
        title: `${walletName} Connected`,
        description: `Successfully connected to ${walletName} (demo mode)`,
      });
    }
  };

  // Only set up event listeners (no auto-connection on page load)

  // Listen for MetaMask account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== walletState.address) {
          // Re-connect with new account
          connectMetaMask();
        }
      };

      const handleChainChanged = () => {
        // Refresh connection when chain changes
        if (walletState.isConnected) {
          connectMetaMask();
        }
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, [walletState.address, walletState.isConnected]);

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
                  {POPULAR_WALLETS.map((wallet) => {
                    const isMetaMask = wallet.name === "MetaMask";
                    const isPhantom = wallet.name === "Phantom";
                    const isCoinbase = wallet.name === "Coinbase Wallet";
                    const isTrustWallet = wallet.name === "Trust Wallet";
                    const isSolflare = wallet.name === "Solflare";
                    const isRainbow = wallet.name === "Rainbow";
                    const isConnected = connectedWallet === wallet.name;
                    
                    let walletInfo = undefined;
                    if (isMetaMask && walletState.isConnected) {
                      walletInfo = {
                        address: walletState.address,
                        balance: walletState.balance,
                        isConnecting: walletState.isConnecting,
                      };
                    } else if (isPhantom && phantomState.isConnected) {
                      walletInfo = {
                        address: phantomState.address,
                        balance: phantomState.balance,
                        isConnecting: phantomState.isConnecting,
                      };
                    } else if (isCoinbase && coinbaseState.isConnected) {
                      walletInfo = {
                        address: coinbaseState.address,
                        balance: coinbaseState.balance,
                        isConnecting: coinbaseState.isConnecting,
                      };
                    } else if (isTrustWallet && trustWalletState.isConnected) {
                      walletInfo = {
                        address: trustWalletState.address,
                        balance: trustWalletState.balance,
                        isConnecting: trustWalletState.isConnecting,
                      };
                    } else if (isSolflare && solflareState.isConnected) {
                      walletInfo = {
                        address: solflareState.address,
                        balance: solflareState.balance,
                        isConnecting: solflareState.isConnecting,
                      };
                    } else if (isRainbow && rainbowState.isConnected) {
                      walletInfo = {
                        address: rainbowState.address,
                        balance: rainbowState.balance,
                        isConnecting: rainbowState.isConnecting,
                      };
                    }

                    return (
                      <WalletCard
                        key={wallet.name}
                        wallet={wallet}
                        onConnect={handleConnectWallet}
                        onDisconnect={(isMetaMask || isPhantom || isCoinbase || isTrustWallet || isSolflare || isRainbow) ? disconnectWallet : undefined}
                        isConnected={isConnected}
                        walletInfo={walletInfo}
                      />
                    );
                  })}
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