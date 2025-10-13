import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import QRCode from "qrcode";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Download, Copy, QrCode, CheckCircle } from "lucide-react";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/lib/auth";
import { fetchWithAuth } from "@/lib/queryClient";
import { SOFVerificationDialog } from "@/components/exchange/sof-verification-dialog";
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

// Coin logo mapping
const WALLET_LOGOS: { [key: string]: string } = {
  BTC: btcLogo,
  ETH: ethLogo,
  USDT: usdtLogo,
  XRP: xrpLogo,
  BNB: bnbLogo,
  DOGE: dogeLogo,
  SOL: solLogo,
  MATIC: polygonLogo,
  ADA: cardanoLogo,
  TRX: trxLogo,
};

// Fallback data
const WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin Wallet',
    symbol: 'BTC',
    icon: '₿',
    logoUrl: btcLogo,
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
    logoUrl: ethLogo,
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
    logoUrl: usdtLogo,
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
  }
];

export default function ReceivePage() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('btc-wallet');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const [showSOFDialog, setShowSOFDialog] = useState(false);
  const { user } = useAuth();
  const { data: walletsData } = useWallets();
  const { data: cryptoMetadata } = useCryptocurrencies();

  // Check SOF status on page load
  useEffect(() => {
    if (user && user.sof === false) {
      setShowSOFDialog(true);
    }
  }, [user]);

  // Get real wallets and create a mapping
  const realWallets = walletsData?.wallets ? 
    walletsData.wallets.map(wallet => {
      const cryptoData = cryptoMetadata?.cryptocurrencies?.[wallet.coin];
      const logoUrl = WALLET_LOGOS[wallet.coin] || cryptoData?.logoUrl;
      return {
        id: `${wallet.coin.toLowerCase()}-wallet`,
        name: `${wallet.coin} Wallet`,
        symbol: wallet.coin,
        icon: cryptoData?.icon || wallet.coin[0],
        logoUrl: logoUrl,
        balance: parseFloat(wallet.balance),
        balanceZAR: parseFloat(wallet.balance) * 1200, // Approximate conversion
        address: wallet.address || `${wallet.coin}-WALLET-001`,
        color: cryptoData?.color || 'bg-gray-500',
        textColor: cryptoData?.textColor || 'text-gray-600',
        network: wallet.network
      };
    }) : [];
  
  // Check if wallet parameter was passed in URL
  const urlParams = new URLSearchParams(window.location.search);
  const walletParam = urlParams.get('wallet');
  const preSelectedWallet = walletParam ? realWallets.find(w => w.symbol.toLowerCase() === walletParam) : null;
  
  // Set the selected wallet if coming from a specific wallet
  useEffect(() => {
    if (preSelectedWallet) {
      setSelectedWallet(preSelectedWallet.id);
    }
  }, [preSelectedWallet]);

  // Initialize selectedNetwork to first network key when wallet changes
  useEffect(() => {
    if (wallet?.network) {
      const firstNetworkKey = Object.keys(wallet.network)[0];
      if (firstNetworkKey) {
        setSelectedNetwork(firstNetworkKey);
      }
    }
  }, [selectedWallet, wallet]);

  const [requestAmount, setRequestAmount] = useState('');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string>("");

  const wallet = realWallets.find(w => w.id === selectedWallet) || realWallets[0] || WALLETS[0];

  const formatBalance = (amount: number, symbol: string) => {
    if (symbol === 'BTC') return amount.toFixed(7);
    if (symbol === 'ETH') return amount.toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const generatePaymentLink = () => {
    if (!wallet) return '';
    
    // Get address based on network
    let address = wallet.address;
    if (wallet.network && selectedNetwork) {
      const networkWallet = wallet.network[selectedNetwork];
      const networkWalletData = walletsData?.wallets?.find(w => w.coin === networkWallet);
      if (networkWalletData?.address) {
        address = networkWalletData.address;
      }
    }
    
    const amount = parseFloat(requestAmount) || 0;
    if (amount > 0) {
      return `${wallet.symbol.toLowerCase()}:${address}?amount=${amount}&message=${encodeURIComponent(message)}`;
    }
    return address;
  };

  // Generate QR code whenever wallet, amount, or message changes
  useEffect(() => {
    const generateQRCode = async () => {
      if (!wallet) return;
      try {
        const paymentData = generatePaymentLink();
        const qrDataURL = await QRCode.toDataURL(paymentData, {
          width: 256,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        });
        setQrCodeDataURL(qrDataURL);
      } catch (error) {
        console.error('Error generating QR code:', error);
      }
    };

    generateQRCode();
  }, [selectedWallet, requestAmount, message, wallet, selectedNetwork, walletsData]);

  return (
    <>
      <SOFVerificationDialog
        isOpen={showSOFDialog}
        onSuccess={() => {
          setShowSOFDialog(false);
        }}
      />
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
                  <Download className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Receive Funds</h1>
                  <p className="text-muted-foreground">
                    Share your wallet address to receive payments
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Receive Form */}
          <div className="flex-1 p-6">
            {!wallet ? (
              <div className="max-w-2xl mx-auto">
                <Card className="p-6">
                  <p className="text-center text-muted-foreground">Loading wallet information...</p>
                </Card>
              </div>
            ) : (
              <div className="max-w-2xl mx-auto space-y-6">
                {/* Wallet Selection */}
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Receive To</h3>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="wallet">
                        {preSelectedWallet ? `Receive to ${preSelectedWallet.name}` : 'Select Wallet'}
                      </Label>
                      {preSelectedWallet ? (
                        <div className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/50">
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                            {preSelectedWallet.logoUrl ? (
                              <img 
                                src={preSelectedWallet.logoUrl} 
                                alt={preSelectedWallet.symbol} 
                                className="w-5 h-5"
                              />
                            ) : (
                              <span className={`${preSelectedWallet.textColor} text-xs font-bold`}>{preSelectedWallet.icon}</span>
                            )}
                          </div>
                          <span className="font-medium">{preSelectedWallet.name}</span>
                          <span className="text-muted-foreground">
                            {formatBalance(preSelectedWallet.balance, preSelectedWallet.symbol)} {preSelectedWallet.symbol}
                          </span>
                        </div>
                      ) : (
                        <Select value={selectedWallet} onValueChange={setSelectedWallet}>
                          <SelectTrigger data-testid="select-wallet">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {realWallets.map((w) => (
                              <SelectItem key={w.id} value={w.id}>
                                <div className="flex items-center space-x-3">
                                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                    {w.logoUrl ? (
                                      <img 
                                        src={w.logoUrl} 
                                        alt={w.symbol} 
                                        className="w-4 h-4"
                                      />
                                    ) : (
                                      <span className="text-black text-xs font-bold">{w.icon}</span>
                                    )}
                                  </div>
                                  <span>{w.name}</span>
                                  <span className="text-muted-foreground">
                                    {formatBalance(w.balance, w.symbol)} {w.symbol}
                                  </span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    {/* Network Selector - shown if wallet has multiple networks */}
                    {wallet.network && (
                      <div>
                        <Label htmlFor="network">Network</Label>
                        <Select value={selectedNetwork} onValueChange={setSelectedNetwork}>
                          <SelectTrigger data-testid="select-network">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(wallet.network).map(([networkKey, networkWallet]) => (
                              <SelectItem key={networkKey} value={networkKey}>
                                <div className="flex items-center space-x-2">
                                  <span>{networkKey} ({networkWallet})</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-sm text-muted-foreground mt-1">
                          Selected network: {selectedNetwork}
                        </p>
                      </div>
                    )}

                    <div className="bg-muted rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Current Balance</span>
                        <div className="text-right">
                          <p className="font-mono font-semibold" data-testid="current-balance">
                            {formatBalance(wallet.balance, wallet.symbol)} {wallet.symbol}
                            {wallet.symbol === 'USDT' && (
                              <Badge variant="secondary" className="ml-2 text-xs">{selectedNetwork}</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            R{wallet.balanceZAR.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>

              {/* Wallet Address */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Your {wallet.symbol} Address</h3>
                <div className="space-y-4">
                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-center mb-4">
                      <div className="w-32 h-32 bg-white rounded-lg flex items-center justify-center">
                        {qrCodeDataURL ? (
                          <img 
                            src={qrCodeDataURL} 
                            alt="Payment QR Code" 
                            className="w-full h-full rounded-lg"
                            data-testid="qr-code-image"
                          />
                        ) : (
                          <QrCode className="w-20 h-20 text-gray-800" />
                        )}
                      </div>
                    </div>
                    <p className="text-center text-sm text-muted-foreground mb-2">
                      {qrCodeDataURL ? "Scan QR code to send payment" : "Generating QR code..."}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="address">Wallet Address</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="address"
                        value={wallet.address}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="wallet-address"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(wallet.address)}
                        className="shrink-0"
                        data-testid="button-copy-address"
                      >
                        {copied ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    {copied && (
                      <p className="text-sm text-green-600 mt-1 flex items-center">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Address copied to clipboard!
                      </p>
                    )}
                  </div>
                </div>
              </Card>

              {/* Payment Request (Optional) */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Payment Request (Optional)</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="amount">Request Amount ({wallet.symbol})</Label>
                    <Input
                      id="amount"
                      type="text"
                      inputMode="decimal"
                      placeholder="0.00"
                      value={requestAmount}
                      onChange={(e) => setRequestAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                      data-testid="input-request-amount"
                    />
                    {requestAmount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ R{(parseFloat(requestAmount) * (wallet.balanceZAR / wallet.balance)).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="message">Message</Label>
                    <Input
                      id="message"
                      type="text"
                      placeholder="Payment for..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      data-testid="input-message"
                    />
                  </div>

                  {(requestAmount || message) && (
                    <div className="bg-muted rounded-lg p-4">
                      <h4 className="font-medium mb-2">Payment Link</h4>
                      <div className="flex space-x-2">
                        <Input
                          value={generatePaymentLink()}
                          readOnly
                          className="font-mono text-xs"
                          data-testid="payment-link"
                        />
                        <Button
                          variant="outline"
                          onClick={() => copyToClipboard(generatePaymentLink())}
                          className="shrink-0"
                          data-testid="button-copy-link"
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Share this link to request a specific amount
                      </p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Instructions */}
              <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold mb-3 text-blue-900 dark:text-blue-100">
                  How to Receive {wallet.symbol}
                </h3>
                <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">1.</span>
                    <span>Share your wallet address or QR code with the sender</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">2.</span>
                    <span>Wait for the transaction to be confirmed on the network</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">3.</span>
                    <span>Funds will appear in your wallet once confirmed</span>
                  </li>
                  <li className="flex items-start space-x-2">
                    <span className="font-semibold">⚠️</span>
                    <span>
                      Only send {wallet.symbol} {wallet.symbol === 'USDT' ? `on the ${selectedNetwork} network ` : ''}to this address. 
                      {wallet.symbol === 'USDT' 
                        ? ` Using a different network may result in permanent loss of funds.`
                        : ' Other tokens may be lost.'}
                    </span>
                  </li>
                </ul>
              </Card>

              {/* Action Button */}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setLocation('/wallets')}
                data-testid="button-done"
              >
                Done
              </Button>
            </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}