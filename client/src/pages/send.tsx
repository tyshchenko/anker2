import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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
import { ArrowLeft, Send, AlertTriangle, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/lib/auth";
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";

// Mock wallet data
const WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin Wallet',
    symbol: 'BTC',
    icon: '₿',
    logoUrl: btcLogo,
    balance: 0.0234567,
    balanceZAR: 28125.45,
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
    color: 'bg-green-600',
    textColor: 'text-green-700'
  }
];

export default function SendPage() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('btc-wallet');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: walletsData } = useWallets();
  
  // Get real wallets and create a mapping
  const realWallets = walletsData?.wallets ? 
    walletsData.wallets.map(wallet => {
      const mockWallet = WALLETS.find(mock => mock.symbol.toLowerCase() === wallet.coin.toLowerCase());
      return {
        id: `${wallet.coin.toLowerCase()}-wallet`,
        name: `${wallet.coin} Wallet`,
        symbol: wallet.coin,
        icon: mockWallet?.icon || wallet.coin[0],
        logoUrl: mockWallet?.logoUrl,
        balance: parseFloat(wallet.balance),
        balanceZAR: parseFloat(wallet.balance) * 1200, // Approximate conversion
        address: wallet.address || `${wallet.coin}-WALLET-001`,
        color: mockWallet?.color || 'bg-gray-500',
        textColor: mockWallet?.textColor || 'text-gray-600'
      };
    }) : WALLETS;

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
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);

  const wallet = realWallets.find(w => w.id === selectedWallet) || realWallets[0];
  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount > 0 && numAmount <= wallet.balance;

  // Mutation for creating send transactions
  const createSendTransactionMutation = useMutation({
    mutationFn: async (sendData: any) => {
      const response = await apiRequest("POST", "/api/send", sendData);
      return response.json();
    },
    onSuccess: (responseData, variables) => {
      // Show the server's success message
      toast({
        title: responseData.message || "Transaction Successful!",
        description: `Sent ${formatBalance(parseFloat(variables.amount), variables.fromAsset)} ${variables.fromAsset} to ${variables.recipientAddress.slice(0, 8)}...${variables.recipientAddress.slice(-8)}`,
      });
      
      // Invalidate queries to refresh wallet balances
      queryClient.invalidateQueries({ queryKey: ["/api/wallets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/transactions"] });
      
      // Set success state with server response data
      setIsConfirming(false);
      setIsSuccess(true);
      setTransactionId(responseData.transactionId || generateTransactionId(wallet.symbol));
    },
    onError: (error: any) => {
      setIsConfirming(false);
      toast({
        title: "Transaction Failed",
        description: error.message || "An error occurred while sending your transaction.",
        variant: "destructive",
      });
    },
  });
  
  // Cryptocurrency address validation functions
  const isValidBitcoinAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Legacy Bitcoin addresses (P2PKH) - start with '1'
    if (address.startsWith('1')) {
      return /^[1][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
    }
    
    // SegWit addresses (P2SH) - start with '3'  
    if (address.startsWith('3')) {
      return /^[3][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(address);
    }
    
    // Bech32 addresses - start with 'bc1'
    if (address.startsWith('bc1')) {
      return /^bc1[a-z0-9]{39,59}$/.test(address);
    }
    
    return false;
  };

  const isValidEthereumAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Ethereum addresses start with '0x' followed by 40 hexadecimal characters
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  const isValidUSDTAddress = (address: string): boolean => {
    // USDT primarily runs on Ethereum blockchain, so use Ethereum address validation
    // Note: USDT also runs on other chains like Tron, but Ethereum is most common
    return isValidEthereumAddress(address);
  };
  
  // Address validation based on wallet type
  const getAddressValidation = () => {
    if (!recipientAddress) return { isValid: false, errorMessage: '' };
    
    if (wallet.symbol === 'BTC') {
      const isValid = isValidBitcoinAddress(recipientAddress);
      return {
        isValid,
        errorMessage: isValid ? '' : 'Please enter a valid Bitcoin address (starts with 1, 3, or bc1)'
      };
    }
    
    if (wallet.symbol === 'ETH') {
      const isValid = isValidEthereumAddress(recipientAddress);
      return {
        isValid,
        errorMessage: isValid ? '' : 'Please enter a valid Ethereum address (starts with 0x followed by 40 characters)'
      };
    }
    
    if (wallet.symbol === 'USDT') {
      const isValid = isValidUSDTAddress(recipientAddress);
      return {
        isValid,
        errorMessage: isValid ? '' : 'Please enter a valid USDT address (Ethereum format: starts with 0x followed by 40 characters)'
      };
    }
    
    // For other cryptocurrencies, use basic length validation
    const isValid = recipientAddress.length > 10;
    return {
      isValid,
      errorMessage: isValid ? '' : `Please enter a valid ${wallet.symbol} wallet address`
    };
  };
  
  const addressValidation = getAddressValidation();
  const isValidAddress = addressValidation.isValid;
  const canSubmit = isValidAmount && isValidAddress;


  const formatBalance = (amount: number, symbol: string) => {
    if (symbol === 'BTC') return amount.toFixed(7);
    if (symbol === 'ETH') return amount.toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  // Generate mock transaction ID based on crypto type
  const generateTransactionId = (symbol: string) => {
    const chars = '0123456789abcdef';
    if (symbol === 'BTC') {
      // Bitcoin transaction ID (64 characters)
      return Array.from({length: 64}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } else if (symbol === 'ETH' || symbol === 'USDT') {
      // Ethereum transaction hash (66 characters with 0x prefix)
      return '0x' + Array.from({length: 64}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    return Array.from({length: 64}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  };

  // Get block explorer URL for different cryptocurrencies
  const getBlockExplorerUrl = (symbol: string, txId: string) => {
    switch (symbol) {
      case 'BTC':
        return `https://blockstream.info/tx/${txId}`;
      case 'ETH':
        return `https://etherscan.io/tx/${txId}`;
      case 'USDT':
        return `https://etherscan.io/tx/${txId}`;
      default:
        return '#';
    }
  };

  const handleSend = () => {
    if (!user?.id || !canSubmit) return;
    
    setIsConfirming(true);
    
    // Create send transaction data
    const sendData = {
      userId: user.id,
      fromAsset: wallet.symbol,
      amount: amount,
      recipientAddress: recipientAddress,
      memo: memo,
    };
    
    createSendTransactionMutation.mutate(sendData);
  };

  const handleCopyTxId = () => {
    navigator.clipboard.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseSuccess = () => {
    setIsSuccess(false);
    setRecipientAddress('');
    setAmount('');
    setMemo('');
    setTransactionId('');
    setLocation('/wallets');
  };

  if (isConfirming) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="p-8 max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Sending Transaction</h2>
          <p className="text-muted-foreground mb-4">
            Please wait while we process your transaction...
          </p>
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </Card>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="p-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Transaction Successful!</h2>
            <p className="text-muted-foreground mb-6">
              Your {wallet.symbol} has been sent successfully to the recipient address.
            </p>
            
            <div className="space-y-4 mb-6">
              <div className="bg-muted rounded-lg p-4">
                <h3 className="font-semibold mb-2">Transaction Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-mono">{amount} {wallet.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">To:</span>
                    <span className="font-mono text-xs">{recipientAddress.slice(0, 10)}...{recipientAddress.slice(-10)}</span>
                  </div>
                  {memo && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Memo:</span>
                      <span>{memo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Transaction ID</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyTxId}
                    className="h-auto p-1"
                    data-testid="button-copy-txid"
                  >
                    {copied ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="font-mono text-xs break-all text-muted-foreground">
                  {transactionId}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(getBlockExplorerUrl(wallet.symbol, transactionId), '_blank')}
                data-testid="button-view-explorer"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View on Block Explorer
              </Button>
              
              <Button
                className="w-full"
                onClick={handleCloseSuccess}
                data-testid="button-close-success"
              >
                Done
              </Button>
            </div>
          </div>
        </Card>
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
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Send Funds</h1>
                  <p className="text-muted-foreground">
                    Transfer funds to another wallet
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Send Form */}
          <div className="flex-1 p-6">
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Wallet Selection */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">From Wallet</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="wallet">
                      {preSelectedWallet ? `From ${preSelectedWallet.name}` : 'Select Wallet'}
                    </Label>
                    {preSelectedWallet ? (
                      <div className="flex items-center space-x-3 p-3 border rounded-lg bg-muted/50">
                        <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                          {preSelectedWallet.logoUrl ? (
                            <img 
                              src={preSelectedWallet.logoUrl} 
                              alt={preSelectedWallet.symbol} 
                              className="w-4 h-4"
                            />
                          ) : (
                            <span className="text-black text-xs font-bold">{preSelectedWallet.icon}</span>
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
                          {realWallets.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex items-center space-x-3">
                                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                                  {wallet.logoUrl ? (
                                    <img 
                                      src={wallet.logoUrl} 
                                      alt={wallet.symbol} 
                                      className="w-4 h-4"
                                    />
                                  ) : (
                                    <span className="text-black text-xs font-bold">{wallet.icon}</span>
                                  )}
                                </div>
                                <span>{wallet.name}</span>
                                <span className="text-muted-foreground">
                                  {formatBalance(wallet.balance, wallet.symbol)} {wallet.symbol}
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="bg-muted rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Available Balance</span>
                      <div className="text-right">
                        <p className="font-mono font-semibold" data-testid="available-balance">
                          {formatBalance(wallet.balance, wallet.symbol)} {wallet.symbol}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          R{wallet.balanceZAR.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Transaction Details */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="address">Recipient Address</Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder={`Enter ${wallet.symbol} wallet address...`}
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      data-testid="input-address"
                    />
                    {recipientAddress && !isValidAddress && (
                      <p className="text-sm text-destructive mt-1 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {addressValidation.errorMessage}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount ({wallet.symbol})</Label>
                    <div className="relative">
                      <Input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        data-testid="input-amount"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs"
                        onClick={() => setAmount(wallet.balance.toString())}
                        data-testid="button-max"
                      >
                        MAX
                      </Button>
                    </div>
                    {amount && !isValidAmount && (
                      <p className="text-sm text-destructive mt-1 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {numAmount > wallet.balance ? 'Insufficient balance' : 'Enter a valid amount'}
                      </p>
                    )}
                    {amount && isValidAmount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ R{(numAmount * (wallet.balanceZAR / wallet.balance)).toLocaleString()}
                      </p>
                    )}
                  </div>


                </div>
              </Card>

              {/* Transaction Summary */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono" data-testid="summary-amount">
                      {amount || '0'} {wallet.symbol}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Network Fee</span>
                    <span className="font-mono">~0.001 {wallet.symbol}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-mono" data-testid="summary-total">
                      {(numAmount + 0.001).toFixed(wallet.symbol === 'BTC' ? 7 : 4)} {wallet.symbol}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setLocation('/wallets')}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleSend}
                  disabled={!canSubmit || createSendTransactionMutation.isPending}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {createSendTransactionMutation.isPending ? "Sending..." : `Send ${wallet.symbol}`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}