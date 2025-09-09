import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { DepositModal } from "@/components/exchange/deposit-modal";
import { WithdrawModal } from "@/components/exchange/withdraw-modal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Send, Download, Eye, EyeOff, CreditCard, TrendingUp, ArrowDownToLine } from "lucide-react";

// Mock wallet data
const WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin Wallet',
    symbol: 'BTC',
    icon: '₿',
    balance: 0.0234567,
    balanceZAR: 28125.45,
    address: '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S',
    color: 'bg-orange-500',
    textColor: 'text-orange-600'
  },
  {
    id: 'eth-wallet',
    name: 'Ethereum Wallet',
    symbol: 'ETH',
    icon: 'Ξ',
    balance: 1.247891,
    balanceZAR: 80423.12,
    address: '0x1234567890abcdef1234567890abcdef12345678',
    color: 'bg-blue-500',
    textColor: 'text-blue-600'
  },
  {
    id: 'usdt-wallet',
    name: 'Tether Wallet',
    symbol: 'USDT',
    icon: '₮',
    balance: 2500.00,
    balanceZAR: 46250.00,
    address: '0xabcdef1234567890abcdef1234567890abcdef12',
    color: 'bg-green-500',
    textColor: 'text-green-600'
  },
  {
    id: 'zar-wallet',
    name: 'ZAR Wallet',
    symbol: 'ZAR',
    icon: 'R',
    balance: 15420.75,
    balanceZAR: 15420.75,
    address: 'ZAR-WALLET-001',
    color: 'bg-purple-500',
    textColor: 'text-purple-600'
  },
  {
    id: 'usd-wallet',
    name: 'USD Wallet',
    symbol: 'USD',
    icon: '$',
    balance: 850.00,
    balanceZAR: 15725.00,
    address: 'USD-WALLET-001',
    color: 'bg-green-600',
    textColor: 'text-green-700'
  },
  {
    id: 'bnb-wallet',
    name: 'BNB Wallet',
    symbol: 'BNB',
    icon: '◉',
    balance: 0,
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
    balance: 0,
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
    balance: 0,
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
    balance: 0,
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
    balance: 0,
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
    balance: 0,
    balanceZAR: 0,
    address: '0xmatic1234567890abcdef1234567890abcdef12345678',
    color: 'bg-purple-600',
    textColor: 'text-purple-700'
  }
];

interface WalletCardProps {
  wallet: typeof WALLETS[0];
  isBalanceVisible: boolean;
  isComingSoon?: boolean;
}

function WalletCard({ wallet, isBalanceVisible, isComingSoon = false }: WalletCardProps) {
  const formatBalance = (amount: number, symbol: string) => {
    if (!isBalanceVisible) return '••••••';
    
    if (symbol === 'BTC') return amount.toFixed(7);
    if (symbol === 'ETH') return amount.toFixed(6);
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
          <div className={`w-12 h-12 rounded-full ${wallet.color} flex items-center justify-center`}>
            <span className="text-white text-lg font-bold">{wallet.icon}</span>
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
          <p className="text-sm text-muted-foreground">Address</p>
          <p className="text-xs font-mono text-muted-foreground" data-testid={`wallet-address-${wallet.id}`}>
            {formatAddress(wallet.address)}
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

// Demo user ID for development
const DEMO_USER_ID = "demo-user-123";

export default function WalletsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const params = useParams();
  
  // Fetch user balance data
  const { data: user } = useQuery({
    queryKey: ['/api/users', DEMO_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/users/${DEMO_USER_ID}`);
      if (!response.ok) {
        // Create demo user if not exists
        const createResponse = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: 'demo-user', password: 'demo-password' })
        });
        if (createResponse.ok) {
          const createData = await createResponse.json();
          return createData;
        }
        throw new Error('Failed to fetch or create user');
      }
      return response.json();
    }
  });

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  const handleWithdrawClick = () => {
    setShowWithdrawModal(true);
  };
  
  // Available wallets (BTC, ETH, USDT)
  const availableWallets = ['BTC', 'ETH', 'USDT'];
  
  // Filter wallets if a specific symbol is provided, and exclude ZAR wallet from regular grid
  const displayWallets = params.symbol 
    ? WALLETS.filter(wallet => wallet.symbol.toLowerCase() === params.symbol?.toLowerCase())
    : WALLETS.filter(wallet => wallet.symbol !== 'ZAR');
    
  // Separate available and coming soon wallets
  const availableDisplayWallets = displayWallets.filter(wallet => availableWallets.includes(wallet.symbol));
  const comingSoonWallets = displayWallets.filter(wallet => !availableWallets.includes(wallet.symbol));

  const totalBalanceZAR = WALLETS.reduce((sum, wallet) => sum + wallet.balanceZAR, 0);

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

          {/* Portfolio Summary */}
          {!params.symbol && (
            <div className="p-6 border-b border-border">
              <Card className="p-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">Total Portfolio Value</p>
                  <p className="text-4xl font-bold mb-4" data-testid="total-portfolio-value">
                    {isBalanceVisible ? `R${totalBalanceZAR.toLocaleString()}` : '••••••••'}
                  </p>
                  <div className="flex justify-center space-x-6 text-sm">
                    <div className="text-center">
                      <p className="text-muted-foreground">Wallets</p>
                      <p className="font-semibold">{WALLETS.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">Assets</p>
                      <p className="font-semibold">{WALLETS.length}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-muted-foreground">24h Change</p>
                      <p className="font-semibold text-green-600">+2.34%</p>
                    </div>
                  </div>
                </div>
              </Card>
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
                          ? `R${user?.zarBalance ? parseFloat(user.zarBalance).toFixed(2) : '0.00'}`
                          : '••••••••'
                        }
                      </p>
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
              {/* Available Wallets */}
              {availableDisplayWallets.map((wallet) => (
                <div 
                  key={wallet.id}
                  className={params.symbol ? "w-full max-w-md" : ""}
                >
                  <WalletCard
                    wallet={wallet}
                    isBalanceVisible={isBalanceVisible}
                    isComingSoon={false}
                  />
                </div>
              ))}
              
              {/* Coming Soon Wallets */}
              {!params.symbol && comingSoonWallets.map((wallet) => (
                <div key={wallet.id}>
                  <WalletCard
                    wallet={wallet}
                    isBalanceVisible={isBalanceVisible}
                    isComingSoon={true}
                  />
                </div>
              ))}
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