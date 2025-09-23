import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useWallets } from "@/hooks/useWallets";
import { fetchWithAuth } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BankAccount {
  id: string;
  email: string;
  account_name: string;
  account_number: string;
  branch_code: string;
  created?: string;
  updated?: string;
  isVerified?: boolean;
  isWhitelisted?: boolean;
}

interface NewBankAccount {
  accountName: string;
  accountNumber: string;
  branchCode: string;
}

// Mock whitelisted bank accounts for demo
const mockBankAccounts: BankAccount[] = [];

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [step, setStep] = useState<"amount" | "bank" | "add-bank">("amount");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [withdrawalType, setWithdrawalType] = useState<"instant" | "regular">("instant");
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [newBankData, setNewBankData] = useState({
    accountName: "",
    accountNumber: "",
    branchCode: ""
  });

  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: walletsData } = useWallets();

  // Fetch bank accounts from API
  const { data: bankAccountsData, isLoading: bankAccountsLoading } = useQuery({
    queryKey: ['/api/bankaccounts'],
    queryFn: async () => {
      const response = await fetchWithAuth('/api/bankaccounts');
      if (!response.ok) throw new Error('Failed to fetch bank accounts');
      return response.json();
    },
    enabled: isOpen, // Only fetch when modal is open
  });

  // Safely extract bank accounts array from API response
  const bankAccounts: BankAccount[] = Array.isArray(bankAccountsData) 
    ? bankAccountsData 
    : Array.isArray(bankAccountsData?.bank_accounts) 
    ? bankAccountsData.bank_accounts 
    : Array.isArray(bankAccountsData?.data) 
    ? bankAccountsData.data 
    : [];

  // Create bank account mutation
  const createBankAccountMutation = useMutation({
    mutationFn: async (bankData: NewBankAccount) => {
      const response = await fetchWithAuth('/api/bankaccount/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bankData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create bank account');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Bank Account Added",
        description: "Your bank account has been added successfully and is pending verification.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/bankaccounts'] });
      setShowAddBankForm(false);
      setNewBankData({ accountName: "", accountNumber: "", branchCode: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Bank Account",
        description: error.message || "An error occurred while adding your bank account.",
        variant: "destructive",
      });
    },
  });

  // Withdraw mutation
  const withdrawMutation = useMutation({
    mutationFn: async (withdrawData: { amount: string; bankAccountId: string; type: string }) => {
      const response = await fetchWithAuth('/api/withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(withdrawData),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process withdrawal');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Withdrawal Initiated",
        description: `Your withdrawal of R${amount} has been initiated successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Withdrawal Failed",
        description: error.message || "An error occurred while processing your withdrawal.",
        variant: "destructive",
      });
    },
  });

  // Get ZAR balance from real wallets or fallback to 0
  const zarWallet = walletsData?.wallets?.find(wallet => wallet.coin === 'ZAR');
  const availableBalance = zarWallet ? parseFloat(zarWallet.balance) : 0;

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setSelectedBank(null);
    setWithdrawalType("instant");
    setShowAddBankForm(false);
    setNewBankData({ accountName: "", accountNumber: "", branchCode: "" });
    onClose();
  };

  const handleAmountNext = () => {
    if (amount && parseFloat(amount) > 0) {
      setStep("bank");
    }
  };

  const handleAddBank = () => {
    if (!newBankData.accountName || !newBankData.accountNumber || !newBankData.branchCode) {
      return;
    }
    createBankAccountMutation.mutate(newBankData);
  };

  const handleWithdraw = () => {
    if (!selectedBank || !amount || withdrawMutation.isPending) return;
    
    const withdrawData = {
      amount,
      bankAccountId: selectedBank,
      type: withdrawalType
    };
    
    withdrawMutation.mutate(withdrawData);
  };

  const handleMaxAmount = () => {
    setAmount((Math.floor(availableBalance*100)/100).toFixed(2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2" />
            Withdraw ZAR
          </DialogTitle>
        </DialogHeader>

        {step === "amount" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-amount">Withdrawal Amount</Label>
              <div className="mt-1">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                    R
                  </span>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="pl-8 pr-16 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
                    data-testid="input-withdraw-amount"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-6 px-2 text-xs text-primary hover:text-primary/80"
                    onClick={handleMaxAmount}
                    data-testid="button-max-amount"
                  >
                    Max
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Available: R{availableBalance.toFixed(2)}
              </p>
            </div>

            {/* Withdrawal Type Selection */}
            <div className="space-y-3">
              <Label>Withdrawal Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className={`
                    flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border transition-all text-left
                    ${withdrawalType === "instant" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border hover:border-primary/30"
                    }
                  `}
                  onClick={() => setWithdrawalType("instant")}
                  data-testid="button-withdrawal-instant"
                >
                  <span className="text-sm font-medium">Instant Withdrawal</span>
                  <span className="text-xs text-muted-foreground">10-30 min bank depending</span>
                </button>
                <button
                  type="button"
                  className={`
                    flex flex-col items-center justify-center space-y-1 p-3 rounded-lg border transition-all text-left
                    ${withdrawalType === "regular" 
                      ? "border-primary bg-primary/5 text-primary" 
                      : "border-border hover:border-primary/30"
                    }
                  `}
                  onClick={() => setWithdrawalType("regular")}
                  data-testid="button-withdrawal-regular"
                >
                  <span className="text-sm font-medium">Regular</span>
                  <span className="text-xs text-muted-foreground">24-48 hours</span>
                </button>
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>• Minimum withdrawal: R50</p>
              <p>• Processing time: {withdrawalType === "instant" ? "10-30 minutes" : "24-48 hours"}</p>
              <p>• No withdrawal fees</p>
            </div>

            <Button 
              onClick={handleAmountNext} 
              className="w-full"
              disabled={!amount || parseFloat(amount) < 50}
              data-testid="button-next-withdraw"
            >
              Next
            </Button>
          </div>
        )}

        {step === "bank" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Whitelisted Bank Accounts</h3>
              
              {/* Real bank accounts */}
              {bankAccountsLoading ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  Loading bank accounts...
                </div>
              ) : bankAccounts.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-4">
                  No bank accounts found. Add one below.
                </div>
              ) : (
                bankAccounts.map((account) => (
                  <Card 
                    key={account.id}
                    className={`p-4 cursor-pointer transition-colors ${
                      selectedBank === account.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setSelectedBank(account.id)}
                    data-testid={`bank-account-${account.id}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <p className="font-medium">{account.account_name}</p>
                          <Badge variant="secondary" className="text-blue-600 bg-blue-50 text-xs">
                            Active
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">****{account.account_number.slice(-4)}</p>
                        <p className="text-xs text-muted-foreground">Branch: {account.branch_code}</p>
                        <p className="text-xs text-muted-foreground">Added: {account.created ? new Date(account.created).toLocaleDateString() : 'Recently'}</p>
                      </div>
                      <Badge variant="secondary" className="text-green-600 bg-green-50">
                        Verified
                      </Badge>
                    </div>
                  </Card>
                ))
              )}


              <Button
                variant="outline"
                className="w-full mt-3"
                onClick={() => setShowAddBankForm(true)}
                data-testid="button-add-bank"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add New Bank Account
              </Button>
            </div>

            {showAddBankForm && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h4 className="text-sm font-medium">Add Bank Account</h4>
                  <div>
                    <Label htmlFor="account-name">Account Holder Name</Label>
                    <Input
                      id="account-name"
                      value={newBankData.accountName}
                      onChange={(e) => setNewBankData(prev => ({ ...prev, accountName: e.target.value }))}
                      placeholder="Full name as per bank account"
                      data-testid="input-account-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="branch-code">Branch Code</Label>
                    <Input
                      id="branch-code"
                      value={newBankData.branchCode}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        if (value.length <= 6) {
                          setNewBankData(prev => ({ ...prev, branchCode: value }));
                        }
                      }}
                      placeholder="e.g., 051001"
                      className="font-mono"
                      data-testid="input-branch-code"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="account-number">Account Number</Label>
                    <Input
                      id="account-number"
                      value={newBankData.accountNumber}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '');
                        setNewBankData(prev => ({ ...prev, accountNumber: value }));
                      }}
                      placeholder="Your bank account number"
                      className="font-mono"
                      data-testid="input-account-number"
                    />
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowAddBankForm(false)}
                      className="flex-1"
                      data-testid="button-cancel-add-bank"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAddBank}
                      className="flex-1"
                      disabled={!newBankData.accountName || !newBankData.accountNumber || !newBankData.branchCode || createBankAccountMutation.isPending}
                      data-testid="button-save-bank"
                    >
                      {createBankAccountMutation.isPending ? "Adding..." : "Add Account"}
                    </Button>
                  </div>
                </div>
              </>
            )}

            {!showAddBankForm && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Amount</span>
                    <span>R{parseFloat(amount || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Fee</span>
                    <span className="text-green-600">Free</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Processing Time</span>
                    <span className="text-blue-600">
                      {withdrawalType === "instant" ? "10-30 min" : "24-48 hours"}
                    </span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Total</span>
                    <span>R{parseFloat(amount || "0").toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() => setStep("amount")}
                    className="flex-1"
                    data-testid="button-back-withdraw"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleWithdraw}
                    className="flex-1"
                    disabled={!selectedBank || withdrawMutation.isPending}
                    data-testid="button-confirm-withdraw"
                  >
                    {withdrawMutation.isPending ? "Processing..." : "Withdraw"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
