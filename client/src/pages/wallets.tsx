import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { DepositModal } from "@/components/exchange/deposit-modal";
import { WithdrawModal } from "@/components/exchange/withdraw-modal";
import { PortfolioChart } from "@/components/exchange/portfolio-chart";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Send, Download, Eye, EyeOff, CreditCard, TrendingUp, ArrowDownToLine, Copy, CheckCircle } from "lucide-react";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/queryClient";
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";
import xrpLogo from "@assets/XRP_1757408614597.png";
import bnbLogo from "@assets/BNB_1757408614597.png";
import dogeLogo from "@assets/Dogecoin_1757409584282.png";
import solLogo from "@assets/SOL_1757408614598.png";
import polygonLogo from "@assets/Polygon_1757409292577.png";
import cardanoLogo from "@assets/Cardano_1757409292578.png";
import trxLogo from "@assets/trx.png";

// Hook to fetch cryptocurrency metadata from API
const useCryptocurrencies = () => {
  return useQuery({
    queryKey: ['/api/cryptocurrencies'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/cryptocurrencies');
      if (!response.ok) throw new Error('Failed to fetch cryptocurrencies');
      return response.json();
    },
  });
};

// Fallback static data (will be removed once API is fully integrated)
const WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin Wallet',
    symbol: 'BTC',
    icon: '₿',
    logoUrl: btcLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S',
    color: 'bg-orange-500',
    textColor: 'text-orange-600'
  },
  {
    id: 'eth-wallet',
    name: 'Ethereum Wallet',
    symbol: 'ETH',
    icon: 'Ξ',
    logoUrl: ethLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    color: 'bg-blue-500',
    textColor: 'text-blue-600'
  },
  {
    id: 'usdt-wallet',
    name: 'Tether Wallet',
    symbol: 'USDT',
    icon: '₮',
    logoUrl: usdtLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    color: 'bg-green-500',
    textColor: 'text-green-600'
  },
  {
    id: 'zar-wallet',
    name: 'ZAR Wallet',
    symbol: 'ZAR',
    icon: 'R',
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'ZAR-WALLET-001',
    color: 'bg-purple-500',
    textColor: 'text-purple-600'
  },
  {
    id: 'usd-wallet',
    name: 'USD Wallet',
    symbol: 'USD',
    icon: '$',
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'USD-WALLET-001',
    color: 'bg-green-600',
    textColor: 'text-green-700'
  },
  {
    id: 'bnb-wallet',
    name: 'BNB Wallet',
    symbol: 'BNB',
    icon: '◉',
    logoUrl: bnbLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '0xbnb1234567890abcdef1234567890abcdef12345678',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600'
  },
  {
    id: 'sol-wallet',
    name: 'Solana Wallet',
    symbol: 'SOL',
    icon: '◎',
    logoUrl: solLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'Sol1234567890abcdef1234567890abcdef1234567890ab',
    color: 'bg-purple-500',
    textColor: 'text-purple-600'
  },
  {
    id: 'xrp-wallet',
    name: 'XRP Wallet',
    symbol: 'XRP',
    icon: '◈',
    logoUrl: xrpLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'rXRP1234567890abcdef1234567890abcdef1234567890',
    color: 'bg-blue-600',
    textColor: 'text-blue-700'
  },
  {
    id: 'ada-wallet',
    name: 'Cardano Wallet',
    symbol: 'ADA',
    icon: '◇',
    logoUrl: cardanoLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'addr1ada1234567890abcdef1234567890abcdef123456789',
    color: 'bg-blue-500',
    textColor: 'text-blue-600'
  },
  {
    id: 'avax-wallet',
    name: 'Avalanche Wallet',
    symbol: 'AVAX',
    icon: '◆',
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '0xavax1234567890abcdef1234567890abcdef12345678',
    color: 'bg-red-500',
    textColor: 'text-red-600'
  },
  {
    id: 'doge-wallet',
    name: 'Dogecoin Wallet',
    symbol: 'DOGE',
    icon: '◊',
    logoUrl: dogeLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'DDoge1234567890abcdef1234567890abcdef1234567890',
    color: 'bg-yellow-600',
    textColor: 'text-yellow-700'
  },
  {
    id: 'matic-wallet',
    name: 'Polygon Wallet',
    symbol: 'MATIC',
    icon: '⬟',
    logoUrl: polygonLogo,
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: '0xmatic1234567890abcdef1234567890abcdef12345678',
    color: 'bg-purple-600',
    textColor: 'text-purple-700'
  },
  {
    id: 'trx-wallet',
    name: 'Tron Wallet',
    symbol: 'TRX',
    icon: '◎',
    balance: 0,
    fee: 0,
    balanceZAR: 0,
    address: 'TRXtron1234567890abcdef1234567890abcdef123456',
    color: 'bg-red-500',
    textColor: 'text-red-600'
  }
];

interface WalletCardProps {
  wallet: typeof WALLETS[0] & { pending?: number };
  isBalanceVisible: boolean;
  isComingSoon?: boolean;
}

interface CopiedState {
  [key: string]: boolean;
}

function WalletCard({ wallet, isBalanceVisible, isComingSoon = false }: WalletCardProps) {
  const [copied, setCopied] = useState<CopiedState>({});

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopied(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };
  const formatBalance = (amount: number, symbol: string) => {
    if (!isBalanceVisible) return '••••••';
    
    if (symbol === 'BTC') return amount.toFixed(8);
    if (symbol === 'ETH') return amount.toFixed(8);
    if (symbol === 'BNB') return amount.toFixed(8);
    if (symbol === 'TRX') return amount.toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  const formatAddress = (address: string) => {
    if (!isBalanceVisible) return '••••••••••••••••••••';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  return (
    <Card className={`p-6 relative ${isComingSoon ? 'overflow-hidden' : ''}`}>
      {isComingSoon && (
        <div className="absolute inset-0 bg-muted/80 backdrop-blur-sm flex items-center justify-center z-10">
          <div className="text-center">
            <div className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-semibold text-lg mb-2">
              Coming Soon
            </div>
            <p className="text-sm text-muted-foreground">
              Support for {wallet.symbol} coming soon
            </p>
          </div>
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center p-1">
            {wallet.logoUrl ? (
              <img 
                src={wallet.logoUrl} 
                alt={`${wallet.symbol} logo`} 
                className="w-full h-full rounded-full object-contain"
              />
            ) : (
              <div className={`w-full h-full rounded-full ${wallet.color} flex items-center justify-center`}>
                <span className="text-white text-lg font-bold">{wallet.icon}</span>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-lg" data-testid={`wallet-name-${wallet.id}`}>
              {wallet.name}
            </h3>
            <p className="text-sm text-muted-foreground" data-testid={`wallet-symbol-${wallet.id}`}>
              {wallet.symbol}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className={wallet.textColor}>
          {isComingSoon ? 'Coming Soon' : 'Active'}
        </Badge>
      </div>

      <div className="space-y-3 mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Balance</p>
          <p className="text-2xl font-bold font-mono" data-testid={`wallet-balance-${wallet.id}`}>
            {formatBalance(wallet.balance, wallet.symbol)} {wallet.symbol}
          </p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground">Value (ZAR)</p>
          <p className="text-lg font-semibold" data-testid={`wallet-value-${wallet.id}`}>
            {isBalanceVisible ? `R${wallet.balanceZAR.toLocaleString()}` : '••••••'}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Pending</p>
          <p className={`text-lg font-semibold ${(wallet.pending || 0) > 0 ? 'text-yellow-600' : ''}`} data-testid={`wallet-pending-${wallet.id}`}>
            {isBalanceVisible ? `${formatBalance(wallet.pending || 0, wallet.symbol)} ${wallet.symbol}` : '••••••'}
          </p>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Address</p>
          <div className="flex items-center space-x-2">
            <p className="text-lg font-semibold flex-1" data-testid={`wallet-address-${wallet.id}`}>
              {formatAddress(wallet.address)}
            </p>
            {isBalanceVisible && (
              <button
                onClick={() => copyToClipboard(wallet.address, `address-${wallet.id}`)}
                className="p-1 rounded hover:bg-muted transition-colors"
                title="Copy full address"
                data-testid={`copy-address-${wallet.id}`}
              >
                {copied[`address-${wallet.id}`] ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                )}
              </button>
            )}
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Miner Fee</p>
          <p className="text-sm font-medium" data-testid={`wallet-miner-fee-${wallet.id}`}>
            { isBalanceVisible ? (
              <>
              { wallet.fee } {wallet.symbol}
              </>
            ) : '••••••'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href={`/send?wallet=${wallet.symbol.toLowerCase()}`}>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            data-testid={`button-send-${wallet.id}`}
            disabled={isComingSoon}
          >
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </Link>
        <Link href={`/receive?wallet=${wallet.symbol.toLowerCase()}`}>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full" 
            data-testid={`button-receive-${wallet.id}`}
            disabled={isComingSoon}
          >
            <Download className="w-4 h-4 mr-2" />
            Receive
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export default function WalletsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const params = useParams();
  const { user } = useAuth();
  
  // Fetch user wallets data
  const { data: walletsData, isLoading: walletsLoading } = useWallets();
  const { data: cryptoMetadata, isLoading: isCryptoLoading } = useCryptocurrencies();
  
  // Fetch market prices for ZAR conversion
  const { data: marketData } = useQuery({
    queryKey: ['/api/market'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/market');
      if (!response.ok) throw new Error('Failed to fetch market data');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };
  
  // Helper function to get ZAR price for a crypto symbol
  const getZARPrice = (symbol: string): number => {
    if (!marketData || symbol === 'ZAR') return 1; // ZAR is 1:1 with itself
    if (symbol === 'USD') return 18.5; // Approximate USD to ZAR rate
    
    const pair = marketData.find((data: any) => data.pair === `${symbol}/ZAR`);
    return pair ? parseFloat(pair.price) : 0;
  };
  
  // Real wallets from the server
  const realWallets = walletsData?.wallets || [];
  
  // Convert server wallet data to display format and merge with crypto metadata
  const displayWallets = realWallets.map(wallet => {
    // Find matching crypto metadata from API for this coin
    const cryptoData = cryptoMetadata?.cryptocurrencies?.[wallet.coin];
    const staticWallet = WALLETS.find(w => w.symbol === wallet.coin);
    
    // Calculate ZAR balance using real market prices
    const balance = parseFloat(wallet.balance);
    const zarPrice = getZARPrice(wallet.coin);
    const balanceZAR = balance * zarPrice;
    
    return {
      id: wallet.id,
      name: cryptoData?.name || staticWallet?.name || `${wallet.coin} Wallet`,
      symbol: wallet.coin,
      icon: cryptoData?.icon || staticWallet?.icon || wallet.coin[0],
      logoUrl: staticWallet?.logoUrl || cryptoData?.logoUrl,
      balance,
      fee: parseFloat(wallet.fee || '0'),
      balanceZAR,
      pending: parseFloat(wallet.pending || '0'),
      address: wallet.address,
      color: cryptoData?.color || staticWallet?.color || 'bg-gray-500',
      textColor: cryptoData?.textColor || staticWallet?.textColor || 'text-gray-600',
      is_active: wallet.is_active
    };
  }).filter(wallet => {
    // Filter by symbol if specified, exclude ZAR from regular grid
    if (params.symbol) {
      return wallet.symbol.toLowerCase() === params.symbol?.toLowerCase();
    }
    return wallet.symbol !== 'ZAR';
  });

  // Calculate total balance from real wallets using real ZAR prices
  const totalBalanceZAR = realWallets.reduce((sum, wallet) => {
    const balance = parseFloat(wallet.balance);
    const zarPrice = getZARPrice(wallet.coin);
    return sum + (balance * zarPrice);
  }, 0);
  
  // Find ZAR wallet for the prominent section
  const zarWallet = realWallets.find(wallet => wallet.coin === 'ZAR');

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
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">
                    {params.symbol ? `${params.symbol?.toUpperCase()} Wallet` : 'My Wallets'}
                  </h1>
                  <p className="text-muted-foreground">
                    {params.symbol 
                      ? `Manage your ${params.symbol?.toUpperCase()} wallet and transactions`
                      : 'Manage your cryptocurrency and fiat wallets'
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
                  data-testid="button-toggle-balance"
                >
                  {isBalanceVisible ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Hide
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Show
                    </>
                  )}
                </Button>
                <Link href="/create-wallet">
                  <Button data-testid="button-add-wallet">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Wallet
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Portfolio Chart */}
          {!params.symbol && realWallets.length > 0 && (
            <div className="p-6 border-b border-border">
              <PortfolioChart 
                wallets={realWallets.map(wallet => ({
                  symbol: wallet.coin,
                  balance: parseFloat(wallet.balance)
                }))}
              />
            </div>
          )}

          {/* Prominent ZAR Wallet Section */}
          {!params.symbol && (
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">ZAR Wallet</h2>
              <Card className="p-8 border-primary/20 bg-card/50 backdrop-blur-sm">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {/* Balance Section */}
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground text-2xl font-bold">R</span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Available Balance</p>
                      <p className="text-3xl font-bold font-mono" data-testid="zar-wallet-balance">
                        {isBalanceVisible 
                          ? `R${zarWallet ? parseFloat(zarWallet.balance).toFixed(2) : '0.00'}`
                          : '••••••••'
                        }
                      </p>
                      {zarWallet && parseFloat(zarWallet.pending || '0') > 0 && (
                        <p className="text-sm text-yellow-600 font-medium" data-testid="zar-wallet-pending">
                          {isBalanceVisible 
                            ? `R${parseFloat(zarWallet.pending).toFixed(2)} pending`
                            : '••••••• pending'
                          }
                        </p>
                      )}
                      <p className="text-sm text-primary/80">South African Rand</p>
                    </div>
                  </div>

                  {/* Stats Section */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Recent Activity</p>
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <span className="text-lg font-semibold text-green-600">+0.00%</span>
                        <span className="text-sm text-muted-foreground">24h</span>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Account Type</p>
                      <Badge variant="secondary" className="text-primary bg-primary/10">
                        Primary Account
                      </Badge>
                    </div>
                  </div>

                  {/* Actions Section */}
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        className="w-full bg-primary hover:bg-primary/90" 
                        size="sm"
                        onClick={handleDepositClick}
                        data-testid="button-deposit-zar"
                      >
                        <CreditCard className="w-4 h-4 mr-2" />
                        Deposit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full border-border hover:bg-accent"
                        onClick={handleWithdrawClick}
                        data-testid="button-withdraw-zar"
                      >
                        <ArrowDownToLine className="w-4 h-4 mr-2" />
                        Withdraw
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Bank account transfers • Secure & verified
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Crypto Wallets Section */}
          {!params.symbol && (
            <div className="px-6 pb-2">
              <h2 className="text-xl font-bold">Cryptocurrency Wallets</h2>
            </div>
          )}

          {/* Wallets Grid */}
          <div className="flex-1 p-6">
            <div className={`${
              params.symbol 
                ? "flex justify-center items-center min-h-[60vh]" 
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            }`}>
              {/* Display actual user wallets */}
              {walletsLoading ? (
                <div className="col-span-full text-center text-muted-foreground">
                  Loading wallets...
                </div>
              ) : displayWallets.length === 0 ? (
                <div className="col-span-full text-center text-muted-foreground">
                  {user ? 'No wallets found.' : 'Please log in to view your wallets.'}
                </div>
              ) : (
                displayWallets.map((wallet) => (
                  <div 
                    key={wallet.id}
                    className={params.symbol ? "w-full max-w-md" : ""}
                  >
                    <Link href={`/wallets/${wallet.symbol.toLowerCase()}`}>
                      <div className="cursor-pointer hover:scale-[1.02] transition-transform duration-200">
                        <WalletCard
                          wallet={wallet}
                          isBalanceVisible={isBalanceVisible}
                          isComingSoon={!wallet.is_active}
                        />
                      </div>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
        
        {/* Deposit Modal */}
        <DepositModal 
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
        
        {/* Withdraw Modal */}
        <WithdrawModal 
          isOpen={showWithdrawModal}
          onClose={() => setShowWithdrawModal(false)}
        />
      </div>
    </div>
  );
}
