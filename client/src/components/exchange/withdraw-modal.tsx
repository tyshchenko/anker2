import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Building2, Plus, X } from "lucide-react";

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountHolderName: string;
  branchNumber: string;
  isVerified: boolean;
  isWhitelisted: boolean;
}

// Mock whitelisted bank accounts for demo
const mockBankAccounts: BankAccount[] = [
  {
    id: "1",
    bankName: "First National Bank",
    accountNumber: "****1234",
    accountHolderName: "John Doe",
    branchNumber: "250655",
    isVerified: true,
    isWhitelisted: true
  },
  {
    id: "2", 
    bankName: "Standard Bank",
    accountNumber: "****5678",
    accountHolderName: "John Doe",
    branchNumber: "051001",
    isVerified: true,
    isWhitelisted: true
  },
  {
    id: "3",
    bankName: "ABSA Bank",
    accountNumber: "****9012", 
    accountHolderName: "John Doe",
    branchNumber: "632005",
    isVerified: false,
    isWhitelisted: false
  }
];

export function WithdrawModal({ isOpen, onClose }: WithdrawModalProps) {
  const [step, setStep] = useState<"amount" | "bank" | "add-bank">("amount");
  const [amount, setAmount] = useState("");
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const [withdrawalType, setWithdrawalType] = useState<"instant" | "regular">("instant");
  const [showAddBankForm, setShowAddBankForm] = useState(false);
  const [newBankData, setNewBankData] = useState({
    bankName: "",
    accountNumber: "",
    accountHolderName: "",
    branchNumber: ""
  });

  // Fetch user data to get ZAR balance
  const { data: user } = useQuery<{ zarBalance: string }>({
    queryKey: ["/api/auth/user"],
    retry: false,
  });

  const availableBalance = user?.zarBalance ? parseFloat(user.zarBalance) : 0;

  const handleClose = () => {
    setStep("amount");
    setAmount("");
    setSelectedBank(null);
    setWithdrawalType("instant");
    setShowAddBankForm(false);
    setNewBankData({ bankName: "", accountNumber: "", accountHolderName: "", branchNumber: "" });
    onClose();
  };

  const handleAmountNext = () => {
    if (amount && parseFloat(amount) > 0) {
      setStep("bank");
    }
  };

  const handleAddBank = () => {
    // In a real app, this would add the bank account to the backend
    console.log("Adding bank account:", newBankData);
    setShowAddBankForm(false);
    setStep("bank");
  };

  const handleWithdraw = () => {
    // In a real app, this would initiate the withdrawal
    console.log("Withdrawing", amount, "to bank account", selectedBank);
    handleClose();
  };

  const handleMaxAmount = () => {
    setAmount(availableBalance.toFixed(2));
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
              
              {/* Whitelisted accounts */}
              {mockBankAccounts.filter(account => account.isWhitelisted).map((account) => (
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
                        <p className="font-medium">{account.bankName}</p>
                        <Badge variant="secondary" className="text-blue-600 bg-blue-50 text-xs">
                          Whitelisted
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                      <p className="text-xs text-muted-foreground">{account.accountHolderName}</p>
                      <p className="text-xs text-muted-foreground">Branch: {account.branchNumber}</p>
                    </div>
                    {account.isVerified && (
                      <Badge variant="secondary" className="text-green-600 bg-green-50">
                        Verified
                      </Badge>
                    )}
                  </div>
                </Card>
              ))}

              {/* Non-whitelisted accounts (pending verification) */}
              {mockBankAccounts.filter(account => !account.isWhitelisted).length > 0 && (
                <>
                  <div className="mt-4">
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Pending Verification</h4>
                    {mockBankAccounts.filter(account => !account.isWhitelisted).map((account) => (
                      <Card 
                        key={account.id}
                        className="p-4 opacity-60 cursor-not-allowed border-dashed"
                        data-testid={`bank-account-pending-${account.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{account.bankName}</p>
                            <p className="text-sm text-muted-foreground">{account.accountNumber}</p>
                            <p className="text-xs text-muted-foreground">{account.accountHolderName}</p>
                            <p className="text-xs text-muted-foreground">Branch: {account.branchNumber}</p>
                          </div>
                          <Badge variant="secondary" className="text-yellow-600 bg-yellow-50">
                            Pending Verification
                          </Badge>
                        </div>
                      </Card>
                    ))}
                  </div>
                </>
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
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="bank-name">Bank Name</Label>
                      <Input
                        id="bank-name"
                        value={newBankData.bankName}
                        onChange={(e) => setNewBankData(prev => ({ ...prev, bankName: e.target.value }))}
                        placeholder="e.g., Standard Bank"
                        data-testid="input-bank-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="branch-number">Branch Code</Label>
                      <Input
                        id="branch-number"
                        value={newBankData.branchNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/[^0-9]/g, '');
                          if (value.length <= 6) {
                            setNewBankData(prev => ({ ...prev, branchNumber: value }));
                          }
                        }}
                        placeholder="e.g., 051001"
                        className="font-mono"
                        data-testid="input-branch-number"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="account-holder">Account Holder Name</Label>
                    <Input
                      id="account-holder"
                      value={newBankData.accountHolderName}
                      onChange={(e) => setNewBankData(prev => ({ ...prev, accountHolderName: e.target.value }))}
                      placeholder="Full name as per bank account"
                      data-testid="input-account-holder"
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
                      disabled={!newBankData.bankName || !newBankData.accountNumber || !newBankData.accountHolderName || !newBankData.branchNumber}
                      data-testid="button-save-bank"
                    >
                      Add to Whitelist
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
                    disabled={!selectedBank}
                    data-testid="button-confirm-withdraw"
                  >
                    Withdraw
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