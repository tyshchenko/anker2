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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Send, AlertTriangle, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, fetchWithAuth } from "@/lib/queryClient";
import { useWallets } from "@/hooks/useWallets";
import { useAuth } from "@/lib/auth";
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

// Static wallet data for fallback
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

export default function SendPage() {
  const [, setLocation] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState('btc-wallet');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: walletsData } = useWallets();
  const { data: cryptoMetadata } = useCryptocurrencies();
  
  // Fetch providers for on-exchange transfers
  const { data: providersData } = useQuery({
    queryKey: ['/api/providers'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/providers');
      if (!response.ok) throw new Error('Failed to fetch providers');
      return response.json();
    },
  });
  
  // Fetch market data for accurate rate calculations
  const { data: marketData = [] } = useQuery({
    queryKey: ['/api/market'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/market');
      if (!response.ok) throw new Error('Failed to fetch market data');
      return response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Helper function to get ZAR rate for a crypto symbol
  const getZARPrice = (symbol: string): number => {
    if (symbol === 'ZAR') return 1; // ZAR is 1:1 with itself
    if (symbol === 'USD') return 18.5; // Approximate USD to ZAR rate
    
    const pair = marketData.find((data: any) => data.pair === `${symbol}/ZAR`);
    return pair ? parseFloat(pair.price) : 0;
  };

  // Get real wallets and create a mapping with accurate rates
  const realWallets = walletsData?.wallets ? 
    walletsData.wallets.map(wallet => {
      const cryptoData = cryptoMetadata?.cryptocurrencies?.[wallet.coin];
      const balance = parseFloat(wallet.balance);
      const zarPrice = getZARPrice(wallet.coin);
      const balanceZAR = balance * zarPrice;
      
      return {
        id: `${wallet.coin.toLowerCase()}-wallet`,
        name: `${wallet.coin} Wallet`,
        symbol: wallet.coin,
        icon: cryptoData?.icon || wallet.coin[0],
        logoUrl: cryptoData?.logoUrl,
        balance,
        balanceZAR,
        fee: parseFloat(wallet.fee || '0'),
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
  const wallet = realWallets.find(w => w.id === selectedWallet) || realWallets[0] || WALLETS[0];

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
        if ( !selectedNetwork || selectedNetwork == '') {
          setSelectedNetwork(firstNetworkKey);
        }
      }
    }
  }, [wallet, selectedNetwork]);

  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [copied, setCopied] = useState(false);
  const [addressType, setAddressType] = useState<'self-hosted' | 'on-exchange'>('self-hosted');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [providerSearchTerm, setProviderSearchTerm] = useState('');

  const numAmount = parseFloat(amount) || 0;
  const fee = wallet?.fee || 0.001;
  const totalWithFee = numAmount + fee;
  const isValidAmount = numAmount > 0 && totalWithFee <= wallet.balance;

  // Sort and filter providers
  const filteredProviders = useMemo(() => {
    if (!providersData?.providers) return [];
    
    // Sort by name
    const sorted = [...providersData.providers].sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    // Filter by search term
    if (!providerSearchTerm) return sorted;
    
    const searchLower = providerSearchTerm.toLowerCase();
    return sorted.filter(provider => 
      provider.name.toLowerCase().includes(searchLower) ||
      provider.description.toLowerCase().includes(searchLower)
    );
  }, [providersData, providerSearchTerm]);

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

  const isValidUSDTAddress = (address: string, network: 'ERC20' | 'TRC20'): boolean => {
    // USDT can run on multiple networks
    // ERC20 uses Ethereum addresses, TRC20 uses Tron addresses
    if (network === 'ERC20') {
      return isValidEthereumAddress(address);
    } else {
      return isValidTronAddress(address);
    }
  };

  const isValidSolanaAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Solana addresses are base58 encoded and typically 32-44 characters
    // They contain characters from base58 alphabet: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
  };

  const isValidBNBAddress = (address: string): boolean => {
    // BNB (Binance Smart Chain) uses the same address format as Ethereum
    return isValidEthereumAddress(address);
  };

  const isValidTronAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Tron addresses start with 'T' and are 34 characters long (base58 encoded)
    return /^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(address);
  };

  const isValidXRPAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // XRP (Ripple) addresses typically start with 'r' and are 25-35 characters (base58)
    return /^r[1-9A-HJ-NP-Za-km-z]{24,34}$/.test(address);
  };

  const isValidDogecoinAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Dogecoin addresses start with 'D' and are similar to Bitcoin (base58)
    return /^D[5-9A-HJ-NP-U][1-9A-HJ-NP-Za-km-z]{32}$/.test(address);
  };

  const isValidPolygonAddress = (address: string): boolean => {
    // Polygon (MATIC) uses the same address format as Ethereum
    return isValidEthereumAddress(address);
  };

  const isValidCardanoAddress = (address: string): boolean => {
    if (!address) return false;
    
    // Remove whitespace
    address = address.trim();
    
    // Cardano addresses start with 'addr1' (mainnet) and are bech32 encoded
    // They are typically 58-103 characters long
    return /^addr1[a-z0-9]{54,99}$/.test(address) || /^DdzFF[1-9A-HJ-NP-Za-km-z]{93}$/.test(address);
  };
  
  // Address validation based on wallet type
  const getAddressValidation = () => {
    if (!recipientAddress) return { isValid: false, errorMessage: '' };
    
    switch (wallet.symbol) {
      case 'BTC': {
        const isValid = isValidBitcoinAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Bitcoin address (starts with 1, 3, or bc1)'
        };
      }
      
      case 'ETH': {
        const isValid = isValidEthereumAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Ethereum address (starts with 0x followed by 40 characters)'
        };
      }
      
      case 'USDT': {
        const isValid = isValidUSDTAddress(recipientAddress, selectedNetwork);
        const networkHint = selectedNetwork === 'ERC20' 
          ? 'Ethereum address: starts with 0x followed by 40 characters'
          : 'Tron address: starts with T, 34 characters';
        return {
          isValid,
          errorMessage: isValid ? '' : `Please enter a valid ${selectedNetwork} USDT address (${networkHint})`
        };
      }
      
      case 'SOL': {
        const isValid = isValidSolanaAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Solana address (32-44 base58 characters)'
        };
      }
      
      case 'BNB': {
        const isValid = isValidBNBAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid BNB address (starts with 0x followed by 40 characters)'
        };
      }
      
      case 'TRX': {
        const isValid = isValidTronAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Tron address (starts with T, 34 characters)'
        };
      }
      
      case 'XRP': {
        const isValid = isValidXRPAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid XRP address (starts with r, 25-35 characters)'
        };
      }
      
      case 'DOGE': {
        const isValid = isValidDogecoinAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Dogecoin address (starts with D)'
        };
      }
      
      case 'MATIC': {
        const isValid = isValidPolygonAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Polygon address (starts with 0x followed by 40 characters)'
        };
      }
      
      case 'ADA': {
        const isValid = isValidCardanoAddress(recipientAddress);
        return {
          isValid,
          errorMessage: isValid ? '' : 'Please enter a valid Cardano address (starts with addr1)'
        };
      }
      
      default: {
        // For other cryptocurrencies, use basic length validation
        const isValid = recipientAddress.length > 10;
        return {
          isValid,
          errorMessage: isValid ? '' : `Please enter a valid ${wallet.symbol} wallet address`
        };
      }
    }
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

  const formatMaxBalance = (amount: number, symbol: string) => {
    if (symbol === 'BTC') return (Math.floor(amount*10000000)/10000000).toFixed(7);
    if (symbol === 'ETH') return (Math.floor(amount*1000000)/1000000).toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return (Math.floor(amount*100)/100).toFixed(2);
    return (Math.floor(amount*10000)/10000).toFixed(4);
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

    // Check 2FA enabled
    if (!user.two_factor_enabled) {
      toast({
        title: "2FA Required",
        description: "You must enable Two-Factor Authentication before you can send funds. Please enable 2FA in your profile settings.",
        variant: "destructive",
      });
      return;
    }

    // Check 2FA code provided
    if (!twoFactorCode || twoFactorCode.length !== 6) {
      toast({
        title: "2FA Code Required",
        description: "Please enter your 6-digit 2FA code to proceed with the transaction.",
        variant: "destructive",
      });
      return;
    }

    // Check verification level
    if (user.verification_level != 'advanced') {
      toast({
        title: "Verification Required",
        description: "You need to complete identity verification before you can send funds. Please verify your account in the profile section.",
        variant: "destructive",
      });
      return;
    }
    
    setIsConfirming(true);
    
    // Create send transaction data
    const sendData = {
      userId: user.id,
      fromAsset: wallet.symbol,
      amount: formatBalance(Number(amount), wallet.symbol),
      fee: formatBalance(fee, wallet.symbol),
      recipientAddress: recipientAddress,
      memo: memo,
      twoFactorCode: twoFactorCode,
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
                          {WALLET_LOGOS[preSelectedWallet.symbol] ? (
                            <img 
                              src={WALLET_LOGOS[preSelectedWallet.symbol]} 
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
                                  {WALLET_LOGOS[wallet.symbol] ? (
                                    <img 
                                      src={WALLET_LOGOS[wallet.symbol]} 
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

                  {/* Network Selector - shown if wallet has multiple networks */}
                  {wallet && wallet.network && (
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
                      <span className="text-sm text-muted-foreground">Available Balance</span>
                      <div className="text-right">
                        {wallet && (
                          <>
                            <p className="font-mono font-semibold" data-testid="available-balance">
                              {formatBalance(wallet.balance, wallet.symbol)} {wallet.symbol}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              R{wallet.balanceZAR.toLocaleString()}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Transaction Details */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Transaction Details</h3>
                <div className="space-y-4">
                  {/* Address Type Selection */}
                  <div>
                    <Label>Recipient Type</Label>
                    <RadioGroup 
                      value={addressType} 
                      onValueChange={(value) => {
                        setAddressType(value as 'self-hosted' | 'on-exchange');
                        setSelectedProvider('');
                      }}
                      className="flex flex-col space-y-2 mt-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="self-hosted" id="self-hosted" data-testid="radio-self-hosted" />
                        <Label htmlFor="self-hosted" className="font-normal cursor-pointer">
                          Self-Hosted Wallet
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="on-exchange" id="on-exchange" data-testid="radio-on-exchange" />
                        <Label htmlFor="on-exchange" className="font-normal cursor-pointer">
                          On Exchange
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Provider Selection - shown only for on-exchange */}
                  {addressType === 'on-exchange' && (
                    <div>
                      <Label htmlFor="provider">Select Exchange</Label>
                      <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                        <SelectTrigger data-testid="select-provider">
                          <SelectValue placeholder="Choose an exchange..." />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 pb-2 sticky top-0 bg-popover z-10">
                            <Input
                              placeholder="Search exchanges..."
                              value={providerSearchTerm}
                              onChange={(e) => setProviderSearchTerm(e.target.value)}
                              className="h-8"
                              data-testid="input-provider-search"
                            />
                          </div>
                          {filteredProviders.length > 0 ? (
                            filteredProviders.map((provider: any) => (
                              <SelectItem key={provider.id} value={provider.id}>
                                <div className="flex flex-col text-left">
                                  <span>{provider.name}</span>
                                  <span className="text-xs text-muted-foreground">{provider.description}</span>
                                </div>
                              </SelectItem>
                            ))
                          ) : (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                              No exchanges found
                            </div>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="address">
                      {addressType === 'on-exchange' ? 'Recipient Username/Email' : 'Recipient Address'}
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      placeholder={
                        addressType === 'on-exchange' 
                          ? `Enter ${selectedProvider ? filteredProviders.find((p: any) => p.id === selectedProvider)?.name : 'exchange'} username or email...`
                          : `Enter ${wallet ? wallet.symbol : '' } wallet address...`
                      }
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      data-testid="input-address"
                    />
                    {recipientAddress && !isValidAddress && addressType === 'self-hosted' && (
                      <p className="text-sm text-destructive mt-1 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {addressValidation.errorMessage}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="amount">Amount ({wallet ? wallet.symbol : ''})</Label>
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
                        onClick={() => setAmount(formatMaxBalance(wallet.balance - fee, wallet.symbol))}
                        data-testid="button-max"
                      >
                        MAX
                      </Button>
                    </div>
                    {amount && !isValidAmount && (
                      <p className="text-sm text-destructive mt-1 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        {totalWithFee > wallet.balance ? `Insufficient balance (including ${fee} ${wallet.symbol} fee)` : 'Enter a valid amount'}
                      </p>
                    )}
                    {amount && isValidAmount && (
                      <p className="text-sm text-muted-foreground mt-1">
                        ≈ R{(numAmount * getZARPrice(wallet.symbol)).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="twoFactorCode">2FA Code</Label>
                    <Input
                      id="twoFactorCode"
                      type="text"
                      inputMode="numeric"
                      placeholder="Enter 6-digit code"
                      value={twoFactorCode}
                      onChange={(e) => setTwoFactorCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                      maxLength={6}
                      disabled={!user?.two_factor_enabled}
                      data-testid="input-2fa-code"
                    />
                    {!user?.two_factor_enabled && (
                      <p className="text-sm text-destructive mt-1 flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-1" />
                        2FA must be enabled to send funds
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
                    <span className="font-mono">{formatBalance(fee, wallet.symbol)} {wallet.symbol}</span>
                  </div>
                  <div className="h-px bg-border" />
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span className="font-mono" data-testid="summary-total">
                      {formatBalance(totalWithFee, wallet.symbol)} {wallet.symbol}
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
                  disabled={!canSubmit || !user?.two_factor_enabled || createSendTransactionMutation.isPending}
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
