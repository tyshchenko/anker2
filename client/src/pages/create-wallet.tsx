import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Wallet, Copy, CheckCircle, AlertTriangle, Eye, EyeOff } from "lucide-react";
import { generateWallet, type GeneratedWallet } from "@/lib/walletGenerator";

const SUPPORTED_CRYPTOCURRENCIES = [
  { symbol: 'BTC', name: 'Bitcoin', icon: '₿', color: 'bg-orange-500' },
  { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', color: 'bg-blue-500' },
  { symbol: 'USDT', name: 'Tether', icon: '₮', color: 'bg-green-500' },
  { symbol: 'BNB', name: 'BNB', icon: '◉', color: 'bg-yellow-500' },
  { symbol: 'SOL', name: 'Solana', icon: '◎', color: 'bg-purple-500' },
  { symbol: 'XRP', name: 'XRP', icon: '◈', color: 'bg-blue-600' },
  { symbol: 'ADA', name: 'Cardano', icon: '◇', color: 'bg-blue-500' },
  { symbol: 'AVAX', name: 'Avalanche', icon: '◆', color: 'bg-red-500' },
  { symbol: 'DOGE', name: 'Dogecoin', icon: '◊', color: 'bg-yellow-600' },
  { symbol: 'MATIC', name: 'Polygon', icon: '⬟', color: 'bg-purple-600' },
];

export default function CreateWalletPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [selectedCrypto, setSelectedCrypto] = useState<string>('');
  const [walletName, setWalletName] = useState<string>('');
  const [generatedWallet, setGeneratedWallet] = useState<GeneratedWallet | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [copied, setCopied] = useState<{ [key: string]: boolean }>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [step, setStep] = useState<'setup' | 'generated' | 'confirmed'>('setup');

  const selectedCryptoData = SUPPORTED_CRYPTOCURRENCIES.find(c => c.symbol === selectedCrypto);

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

  const handleGenerateWallet = async () => {
    if (!selectedCrypto) return;
    
    setIsGenerating(true);
    
    // Simulate wallet generation process
    setTimeout(() => {
      const wallet = generateWallet(selectedCrypto);
      setGeneratedWallet(wallet);
      setStep('generated');
      setIsGenerating(false);
    }, 1500);
  };

  // Mutation to create wallet on server
  const createWalletMutation = useMutation({
    mutationFn: async (walletData: { coin: string; address: string; private_key: string }) => {
      const response = await fetch('/api/wallet/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include session cookies for authentication
        body: JSON.stringify(walletData),
      });

      if (!response.ok) {
        throw new Error('Failed to create wallet');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate wallets query to refresh the sidebar and wallets page
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      setStep('confirmed');
    },
    onError: (error) => {
      console.error('Failed to create wallet:', error);
      alert('Failed to create wallet. Please try again.');
    },
  });

  const handleConfirmWallet = () => {
    if (!generatedWallet || !isAuthenticated) return;

    // Create wallet data for server
    const walletData = {
      coin: generatedWallet.symbol,
      address: generatedWallet.address,
      private_key: generatedWallet.privateKey,
    };

    createWalletMutation.mutate(walletData);
  };

  const handleCreateAnother = () => {
    setSelectedCrypto('');
    setWalletName('');
    setGeneratedWallet(null);
    setShowPrivateKey(false);
    setCopied({});
    setStep('setup');
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
                          {SUPPORTED_CRYPTOCURRENCIES.map((crypto) => (
                            <SelectItem key={crypto.symbol} value={crypto.symbol}>
                              <div className="flex items-center space-x-2">
                                <div className={`w-6 h-6 rounded-full ${crypto.color} flex items-center justify-center text-white text-sm font-bold`}>
                                  {crypto.icon}
                                </div>
                                <span>{crypto.name} ({crypto.symbol})</span>
                              </div>
                            </SelectItem>
                          ))}
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
                          <div className={`w-8 h-8 rounded-full ${selectedCryptoData?.color} flex items-center justify-center text-white font-bold`}>
                            {selectedCryptoData?.icon}
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
                      onClick={handleGenerateWallet}
                      disabled={!selectedCrypto || isGenerating}
                      className="w-full"
                      data-testid="button-generate-wallet"
                    >
                      {isGenerating ? (
                        <>
                          <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                          Generating Wallet...
                        </>
                      ) : (
                        'Generate Wallet'
                      )}
                    </Button>
                  </div>
                </Card>
              )}

              {step === 'generated' && generatedWallet && (
                <div className="space-y-6">
                  <Card className="p-6">
                    <div className="flex items-center space-x-3 mb-4">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <h2 className="text-xl font-semibold">Wallet Generated Successfully!</h2>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                        <div>
                          <h3 className="font-medium text-yellow-800">Important Security Notice</h3>
                          <p className="text-sm text-yellow-700 mt-1">
                            Save your private key securely. Anyone with access to your private key can control your funds. 
                            Never share it with anyone or store it online.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>Wallet Address</Label>
                        <div className="flex space-x-2">
                          <Input
                            value={generatedWallet.address}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="generated-address"
                          />
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(generatedWallet.address, 'address')}
                            className="shrink-0"
                          >
                            {copied.address ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Private Key</Label>
                        <div className="flex space-x-2">
                          <Input
                            type={showPrivateKey ? "text" : "password"}
                            value={generatedWallet.privateKey}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="generated-private-key"
                          />
                          <Button
                            variant="outline"
                            onClick={() => setShowPrivateKey(!showPrivateKey)}
                            className="shrink-0"
                          >
                            {showPrivateKey ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(generatedWallet.privateKey, 'privateKey')}
                            className="shrink-0"
                          >
                            {copied.privateKey ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label>Public Key</Label>
                        <div className="flex space-x-2">
                          <Input
                            value={generatedWallet.publicKey}
                            readOnly
                            className="font-mono text-sm"
                            data-testid="generated-public-key"
                          />
                          <Button
                            variant="outline"
                            onClick={() => copyToClipboard(generatedWallet.publicKey, 'publicKey')}
                            className="shrink-0"
                          >
                            {copied.publicKey ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-3 mt-6">
                      <Button
                        onClick={handleConfirmWallet}
                        disabled={createWalletMutation.isPending || !isAuthenticated}
                        className="flex-1"
                        data-testid="button-confirm-wallet"
                      >
                        {createWalletMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-current border-t-transparent animate-spin rounded-full mr-2" />
                            Saving Wallet...
                          </>
                        ) : (
                          "I've Saved My Private Key"
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={handleCreateAnother}
                        disabled={createWalletMutation.isPending}
                        data-testid="button-create-another"
                      >
                        Create Another
                      </Button>
                    </div>
                  </Card>
                </div>
              )}

              {step === 'confirmed' && (
                <Card className="p-6 text-center">
                  <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
                  <h2 className="text-2xl font-semibold mb-2">Wallet Created Successfully!</h2>
                  <p className="text-muted-foreground mb-6">
                    Your {generatedWallet?.symbol} wallet has been added to your account. 
                    You can now receive and send {generatedWallet?.symbol}.
                  </p>
                  
                  <div className="flex space-x-3 justify-center">
                    <Button
                      onClick={() => setLocation('/wallets')}
                      data-testid="button-view-wallets"
                    >
                      View All Wallets
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCreateAnother}
                      data-testid="button-create-another-final"
                    >
                      Create Another Wallet
                    </Button>
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