import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/queryClient";
import { useWallets } from "@/hooks/useWallets";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Wallet, Copy, CheckCircle, QrCode } from "lucide-react";
import QRCode from "qrcode";
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

interface MarketData {
  pair: string;
  price: string;
  change_24h: string;
  volume_24h: string;
  timestamp: string;
}

interface CreatedWallet {
  email: string;
  coin: string;
  address: string;
  balance: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Fetch market data from server
const useMarketData = () => {
  return useQuery({
    queryKey: ['/api/market'],
    queryFn: async (): Promise<MarketData[]> => {
      const response = await fetchWithAuth('/api/market');
      if (!response.ok) throw new Error('Failed to fetch market data');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

// Extract crypto currencies from market pairs
function getAvailableCryptos(marketData: MarketData[]) {
  if (!marketData || marketData.length === 0) {
    return [];
  }
  
  const cryptos = new Set<string>();
  
  marketData.forEach(data => {
    const [crypto, fiat] = data.pair.split('/');
    if (crypto && fiat) {
      cryptos.add(crypto);
    }
  });
  //cryptos.delete('USDT')

  return Array.from(cryptos);
}

const CRYPTO_DISPLAY_INFO: Record<string, { name: string; icon: string; color: string; logoUrl?: string }> = {
  'BTC': { name: 'Bitcoin', icon: '₿', color: 'bg-orange-500', logoUrl: btcLogo },
  'ETH': { name: 'Ethereum', icon: 'Ξ', color: 'bg-blue-500', logoUrl: ethLogo },
  'USDT': { name: 'Tether', icon: '₮', color: 'bg-green-500', logoUrl: usdtLogo },
  'BNB': { name: 'BNB', icon: '◉', color: 'bg-yellow-500', logoUrl: bnbLogo },
  'SOL': { name: 'Solana', icon: '◎', color: 'bg-purple-500', logoUrl: solLogo },
  'TRX': { name: 'Tron', icon: '◎', color: 'bg-red-500', logoUrl: trxLogo },
  'XRP': { name: 'XRP', icon: '◈', color: 'bg-blue-600', logoUrl: xrpLogo },
  'ADA': { name: 'Cardano', icon: '◇', color: 'bg-blue-500', logoUrl: cardanoLogo },
  'AVAX': { name: 'Avalanche', icon: '◆', color: 'bg-red-500' },
  'DOGE': { name: 'Dogecoin', icon: '◊', color: 'bg-yellow-600', logoUrl: dogeLogo },
  'MATIC': { name: 'Polygon', icon: '⬟', color: 'bg-purple-600', logoUrl: polygonLogo },
};

export default function CreateWalletPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [walletName, setWalletName] = useState<string>('');
  const [createdWallet, setCreatedWallet] = useState<CreatedWallet | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [step, setStep] = useState<'setup' | 'success'>('setup');
  const { toast } = useToast();

  // Fetch market data to get available cryptocurrencies
  const { data: marketData = [], isLoading: isLoadingMarket } = useMarketData();
  
  // Fetch user's existing wallets
  const { data: walletsResponse, isLoading: isLoadingWallets } = useWallets();
  
  // Get available cryptocurrencies that user doesn't already have
  const availableCryptos = useMemo(() => {
    const allCryptos = getAvailableCryptos(marketData);
    const existingCoins = walletsResponse?.wallets?.map(w => w.coin) || [];
    return allCryptos.filter(crypto => !existingCoins.includes(crypto));
  }, [marketData, walletsResponse]);

  const selectedCryptoData = selectedCrypto ? {
    symbol: selectedCrypto,
    ...CRYPTO_DISPLAY_INFO[selectedCrypto],
    name: CRYPTO_DISPLAY_INFO[selectedCrypto]?.name || selectedCrypto
  } : null;

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

  // Generate QR code for wallet address
  const generateQRCode = async (address: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(address, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrCodeDataUrl);
    } catch (error) {
      console.error('Failed to generate QR code:', error);
    }
  };

  // Mutation to create wallet on server
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: { coin: string }) => {
      const response = await fetchWithAuth('/api/wallet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(walletData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create wallet');
      }
      const data = await response.json();
      return data.wallet;
    },
    onSuccess: async (wallet: CreatedWallet) => {
      setCreatedWallet(wallet);
      if (wallet.address) {
        await generateQRCode(wallet.address);
      }
      // Invalidate wallets query to refresh the sidebar and wallets page
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      setStep('success');
    },
    onError: (error) => {
      console.error('Failed to create wallet:', error);
      toast({
        title: "Failed to create wallet",
        description: error.message || "Failed to create wallet. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCreateWallet = () => {
    if (!selectedCrypto || !isAuthenticated) return;

    createWalletMutation.mutate({ coin: selectedCrypto });
  };

  const handleCreateAnother = () => {
    setSelectedCrypto('');
    setWalletName('');
    setCreatedWallet(null);
    setQrCodeUrl('');
    setCopied({});
    setStep('setup');
  };

  const handleDone = () => {
    setLocation('/wallets');
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
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setLocation('/wallets')}
                data-testid="button-back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Create New Wallet</h1>
                  <p className="text-muted-foreground">
                    Generate a new cryptocurrency wallet securely
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto">
              {step === 'setup' && (
                <Card className="p-6">
                  <h2 className="text-xl font-semibold mb-6">Wallet Setup</h2>

                  <div className="space-y-6">
                    <div>
                      <Label htmlFor="crypto-select">Select Cryptocurrency</Label>
                      <Select value={selectedCrypto} onValueChange={setSelectedCrypto}>
                        <SelectTrigger data-testid="select-cryptocurrency">
                          <SelectValue placeholder="Choose a cryptocurrency" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingMarket || isLoadingWallets ? (
                            <SelectItem value="loading" disabled>
                              Loading available cryptocurrencies...
                            </SelectItem>
                          ) : availableCryptos.length === 0 ? (
                            <SelectItem value="none" disabled>
                              No new cryptocurrencies available
                            </SelectItem>
                          ) : (
                            availableCryptos.map((crypto) => {
                              const cryptoInfo = CRYPTO_DISPLAY_INFO[crypto] || { name: crypto, icon: '◉', color: 'bg-gray-500' };
                              return (
                                <SelectItem key={crypto} value={crypto}>
                                  <div className="flex items-center space-x-2">
                                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center p-0.5">
                                      {cryptoInfo.logoUrl ? (
                                        <img 
                                          src={cryptoInfo.logoUrl} 
                                          alt={`${crypto} logo`} 
                                          className="w-full h-full rounded-full object-contain"
                                        />
                                      ) : (
                                        <div className={`w-full h-full rounded-full ${cryptoInfo.color} flex items-center justify-center text-white text-sm font-bold`}>
                                          {cryptoInfo.icon}
                                        </div>
                                      )}
                                    </div>
                                    <span>{cryptoInfo.name} ({crypto})</span>
                                  </div>
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="wallet-name">Wallet Name (Optional)</Label>
                      <Input
                        id="wallet-name"
                        placeholder="My Bitcoin Wallet"
                        value={walletName}
                        onChange={(e) => setWalletName(e.target.value)}
                        data-testid="input-wallet-name"
                      />
                    </div>

                    {selectedCrypto && (
                      <div className="bg-muted rounded-lg p-4">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1">
                            {selectedCryptoData?.logoUrl ? (
                              <img 
                                src={selectedCryptoData.logoUrl} 
                                alt={`${selectedCrypto} logo`} 
                                className="w-full h-full rounded-full object-contain"
                              />
                            ) : (
                              <div className={`w-full h-full rounded-full ${selectedCryptoData?.color} flex items-center justify-center text-white font-bold`}>
                                {selectedCryptoData?.icon}
                              </div>
                            )}
                          </div>
                          <div>
                            <h3 className="font-medium">{selectedCryptoData?.name} Wallet</h3>
                            <p className="text-sm text-muted-foreground">
                              {walletName || `My ${selectedCryptoData?.name} Wallet`}
                            </p>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          This will generate a new {selectedCryptoData?.name} wallet with a unique address and private key.
                        </p>
                      </div>
                    )}

                    <Button
                      onClick={handleCreateWallet}
                      disabled={!selectedCrypto || createWalletMutation.isPending || isLoadingMarket || isLoadingWallets}
                      className="w-full"
                      data-testid="button-create-wallet"
                    >
                      {createWalletMutation.isPending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                          Creating Wallet...
                        </>
                      ) : (
                        'Create Wallet'
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {step === 'success' && createdWallet && (
                <Card className="p-6 text-center">
                  <div className="flex items-center justify-center space-x-3 mb-6">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <h2 className="text-2xl font-semibold">Wallet Generated Successfully!</h2>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="text-lg font-medium mb-2 block">Wallet Address</Label>
                      <div className="bg-muted rounded-lg p-4 mb-4">
                        <div className="flex space-x-2 mb-3">
                          <Input
                            value={createdWallet.address || ''}
                            readOnly
                            className="font-mono text-sm text-center"
                            data-testid="created-wallet-address"
                          />
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(createdWallet.address || '', 'address')}
                            className="shrink-0"
                          >
                            {copied.address ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                        
                        {qrCodeUrl && (
                          <div className="flex justify-center">
                            <div className="bg-white p-4 rounded-lg border border-border">
                              <img src={qrCodeUrl} alt="Wallet Address QR Code" className="w-48 h-48" />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center justify-center space-x-2 mb-2">
                        <QrCode className="w-5 h-5 text-blue-600" />
                        <h3 className="font-medium text-blue-800">Share Your Address</h3>
                      </div>
                      <p className="text-sm text-blue-700">
                        Use this address to receive {createdWallet.coin}. You can copy the address or share the QR code.
                      </p>
                    </div>

                    <div className="flex space-x-3 justify-center">
                      <Button
                        onClick={handleDone}
                        className="px-8"
                        data-testid="button-done"
                      >
                        Done
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCreateAnother}
                        className="px-8"
                        data-testid="button-create-another"
                      >
                        Create Another
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
