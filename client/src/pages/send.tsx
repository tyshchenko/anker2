import { useState, useEffect } from "react";
import { useLocation } from "wouter";
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
import { ArrowLeft, Send, AlertTriangle, CheckCircle } from "lucide-react";

// Mock wallet data
const WALLETS = [
  {
    id: 'btc-wallet',
    name: 'Bitcoin Wallet',
    symbol: 'BTC',
    icon: '₿',
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
  
  // Check if wallet parameter was passed in URL
  const urlParams = new URLSearchParams(window.location.search);
  const walletParam = urlParams.get('wallet');
  const preSelectedWallet = walletParam ? WALLETS.find(w => w.symbol.toLowerCase() === walletParam) : null;
  
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

  const wallet = WALLETS.find(w => w.id === selectedWallet) || WALLETS[0];
  const numAmount = parseFloat(amount) || 0;
  const isValidAmount = numAmount > 0 && numAmount <= wallet.balance;
  const isValidAddress = recipientAddress.length > 10;
  const canSubmit = isValidAmount && isValidAddress;

  const formatBalance = (amount: number, symbol: string) => {
    if (symbol === 'BTC') return amount.toFixed(7);
    if (symbol === 'ETH') return amount.toFixed(6);
    if (['ZAR', 'USD'].includes(symbol)) return amount.toFixed(2);
    return amount.toFixed(4);
  };

  const handleSend = () => {
    setIsConfirming(true);
    // Simulate sending
    setTimeout(() => {
      setIsConfirming(false);
      setLocation('/wallets');
    }, 2000);
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
                        <div className={`w-6 h-6 rounded-full ${preSelectedWallet.color} flex items-center justify-center`}>
                          <span className="text-white text-xs font-bold">{preSelectedWallet.icon}</span>
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
                          {WALLETS.map((wallet) => (
                            <SelectItem key={wallet.id} value={wallet.id}>
                              <div className="flex items-center space-x-3">
                                <div className={`w-6 h-6 rounded-full ${wallet.color} flex items-center justify-center`}>
                                  <span className="text-white text-xs font-bold">{wallet.icon}</span>
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
                        Please enter a valid wallet address
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

                  <div>
                    <Label htmlFor="memo">Memo (Optional)</Label>
                    <Input
                      id="memo"
                      type="text"
                      placeholder="Add a note for this transaction..."
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      data-testid="input-memo"
                    />
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
                  disabled={!canSubmit}
                  data-testid="button-send"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Send {wallet.symbol}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}