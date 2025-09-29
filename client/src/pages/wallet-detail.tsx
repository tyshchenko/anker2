import { useState, useEffect, useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { ChartPanel } from "@/components/exchange/chart-panel";
import { TradingPanel } from "@/components/exchange/trading-panel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Wallet, Send, Download, Eye, EyeOff, Copy, CheckCircle } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useWallets } from "@/hooks/useWallets";
import { fetchWithAuth } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";
import xrpLogo from "@assets/XRP_1757408614597.png";
import bnbLogo from "@assets/BNB_1757408614597.png";
import dogeLogo from "@assets/Dogecoin_1757409584282.png";
import solLogo from "@assets/SOL_1757408614598.png";

// Static wallet data for fallback
const WALLET_LOGOS: { [key: string]: string } = {
  BTC: btcLogo,
  ETH: ethLogo,
  USDT: usdtLogo,
  XRP: xrpLogo,
  BNB: bnbLogo,
  DOGE: dogeLogo,
  SOL: solLogo,
};

const WALLET_COLORS: { [key: string]: string } = {
  BTC: 'bg-orange-500',
  ETH: 'bg-blue-500',
  USDT: 'bg-green-500',
  XRP: 'bg-blue-600',
  BNB: 'bg-yellow-500',
  DOGE: 'bg-yellow-600',
  SOL: 'bg-purple-500',
};

export default function WalletDetailPage() {
  const params = useParams<{ coin: string }>();
  const coin = params.coin?.toUpperCase() || '';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [copied, setCopied] = useState(false);
  const [currentPair] = useState(`${coin}/ZAR`);
  
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch user wallets data
  const { data: walletsData, isLoading: walletsLoading } = useWallets();
  
  // Fetch market data for all pairs
  const { data: marketData } = useQuery({
    queryKey: ['/api/market'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/market');
      if (!response.ok) throw new Error('Failed to fetch market data');
      return response.json();
    },
    refetchInterval: 30000,
  });

  // Helper function to get ZAR price for a crypto symbol (same as wallets page)
  const getZARPrice = (symbol: string): number => {
    if (!marketData || symbol === 'ZAR') return 1; // ZAR is 1:1 with itself
    if (symbol === 'USD') return 18.5; // Approximate USD to ZAR rate
    
    const pair = marketData.find((data: any) => data.pair === `${symbol}/ZAR`);
    return pair ? parseFloat(pair.price) : 0;
  };

  // Find the specific wallet for this coin
  const wallet = useMemo(() => {
    if (!walletsData?.wallets) return null;
    
    const userWallet = walletsData.wallets.find(w => w.coin.toUpperCase() === coin);
    if (!userWallet) return null;

    const balance = parseFloat(userWallet.balance);
    const pending = parseFloat(userWallet.pending || '0');
    const fee = parseFloat(userWallet.fee || '0');
    
    // Get current price from market data using ZAR price function
    const currentPrice = getZARPrice(coin);
    const balanceZAR = balance * currentPrice;

    return {
      id: userWallet.id,
      name: `${coin} Wallet`,
      symbol: coin,
      logoUrl: WALLET_LOGOS[coin],
      color: WALLET_COLORS[coin] || 'bg-gray-500',
      balance,
      pending,
      fee,
      balanceZAR,
      address: userWallet.address,
      currentPrice,
    };
  }, [walletsData, coin, marketData]);

  // Copy address to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Copied!",
        description: "Address copied to clipboard",
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  // Format balance based on currency
  const formatBalance = (amount: number, symbol: string) => {
    if (!isBalanceVisible) return '••••••';
    
    if (symbol === 'BTC') return amount.toFixed(7);
    if (symbol === 'ETH') return amount.toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  const formatAddress = (address: string) => {
    if (!isBalanceVisible) return '••••••••••••••••••••';
    return `${address.slice(0, 12)}...${address.slice(-12)}`;
  };

  // Handle pair change from trading panel
  const handlePairChange = (from: string, to: string, action: "buy" | "sell" | "convert") => {
    // Could update current pair if needed, but for now just log
    console.log(`Trading: ${action} ${from} for ${to}`);
  };

  if (walletsLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p>Loading wallet...</p>
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Wallet Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested {coin} wallet was not found.</p>
          <Button onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

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
          {/* Left Panel - Chart */}
          <main className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <MobileHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
            />

            {/* Page Header */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => window.history.back()}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1">
                    {wallet.logoUrl ? (
                      <img 
                        src={wallet.logoUrl} 
                        alt={`${coin} logo`} 
                        className="w-full h-full rounded-full object-contain"
                      />
                    ) : (
                      <div className={`w-full h-full rounded-full ${wallet.color} flex items-center justify-center`}>
                        <span className="text-white text-lg font-bold">{coin[0]}</span>
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">{wallet.name}</h1>
                    <p className="text-muted-foreground">{coin} Trading & Wallet</p>
                  </div>
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsBalanceVisible(!isBalanceVisible)}
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
              </div>
            </div>

            {/* Chart Section */}
            <div className="flex-1 p-6">
              <ChartPanel currentPair={currentPair} />
            </div>
          </main>

          {/* Right Panel - Wallet Info & Buy Form */}
          <div className="lg:w-80 bg-card border-l border-border flex flex-col">
            {/* Wallet Info */}
            <div className="p-6 border-b border-border">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold">Wallet</h2>
                </div>
                <Badge variant="secondary" className="text-green-600 bg-green-50">
                  Active
                </Badge>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="text-2xl font-bold font-mono">
                    {formatBalance(wallet.balance, coin)} {coin}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isBalanceVisible ? `≈ R${wallet.balanceZAR.toLocaleString()}` : '••••••'}
                  </p>
                </div>

                {wallet.pending > 0 && (
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-lg font-semibold text-yellow-600">
                      {isBalanceVisible ? `${formatBalance(wallet.pending, coin)} ${coin}` : '••••••'}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-lg font-semibold">
                    {isBalanceVisible ? `R${wallet.currentPrice.toLocaleString()}` : '••••••'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Network Fee</p>
                  <p className="text-sm font-medium">
                    {isBalanceVisible ? `${wallet.fee} ${coin}` : '••••••'}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-mono flex-1">
                      {formatAddress(wallet.address)}
                    </p>
                    {isBalanceVisible && (
                      <button
                        onClick={() => copyToClipboard(wallet.address)}
                        className="p-1 rounded hover:bg-muted transition-colors"
                        title="Copy address"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Wallet Actions */}
              <div className="grid grid-cols-2 gap-3 mt-6">
                <Button variant="outline" size="sm" className="w-full">
                  <Send className="w-4 h-4 mr-2" />
                  Send
                </Button>
                <Button variant="outline" size="sm" className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Receive
                </Button>
              </div>
            </div>

            {/* Trading Panel */}
            <div className="flex-1 p-6">
              <TradingPanel onPairChange={handlePairChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}