import { useState } from "react";
import { Link, useParams } from "wouter";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Wallet, Plus, Send, Download, Eye, EyeOff } from "lucide-react";

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
}

function WalletCard({ wallet, isBalanceVisible }: WalletCardProps) {
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
    <Card className="p-6">
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
          Active
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
        <Link href="/send">
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-send-${wallet.id}`}>
            <Send className="w-4 h-4 mr-2" />
            Send
          </Button>
        </Link>
        <Link href="/receive">
          <Button variant="outline" size="sm" className="w-full" data-testid={`button-receive-${wallet.id}`}>
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
  const params = useParams();
  
  // Filter wallets if a specific symbol is provided
  const displayWallets = params.symbol 
    ? WALLETS.filter(wallet => wallet.symbol.toLowerCase() === params.symbol?.toLowerCase())
    : WALLETS;

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

          {/* Wallets Grid */}
          <div className="flex-1 p-6">
            <div className={`${
              params.symbol 
                ? "flex justify-center items-center min-h-[60vh]" 
                : "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
            }`}>
              {displayWallets.map((wallet) => (
                <div 
                  key={wallet.id}
                  className={params.symbol ? "w-full max-w-md" : ""}
                >
                  <WalletCard
                    wallet={wallet}
                    isBalanceVisible={isBalanceVisible}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}