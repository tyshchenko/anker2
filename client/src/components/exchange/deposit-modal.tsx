import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign } from "lucide-react";

// Demo user ID for development
const DEMO_USER_ID = "demo-user-123";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [phoneReference, setPhoneReference] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"card" | "bank">("card");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: string; phoneReference: string }) => {
      const response = await fetch(`/api/users/${DEMO_USER_ID}/deposit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          amount: data.amount,
          phoneReference: data.phoneReference
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to process deposit');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Deposit Successful",
        description: `R${parseFloat(amount).toFixed(2)} has been added to your account. New balance: R${parseFloat(data.balance).toFixed(2)}`,
      });
      
      // Refresh balance data
      queryClient.invalidateQueries({ queryKey: ['/api/users', DEMO_USER_ID] });
      
      // Reset form and close modal
      setAmount("");
      setPhoneReference("");
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const depositAmount = parseFloat(amount);
    if (!depositAmount || depositAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount < 10) {
      toast({
        title: "Minimum Deposit",
        description: "Minimum deposit amount is R10.00",
        variant: "destructive",
      });
      return;
    }

    if (depositAmount > 50000) {
      toast({
        title: "Maximum Deposit",
        description: "Maximum deposit amount is R50,000.00",
        variant: "destructive",
      });
      return;
    }

    // Validate phone reference
    if (!phoneReference || phoneReference.trim() === "") {
      toast({
        title: "Phone Reference Required",
        description: "Please enter your phone number as reference",
        variant: "destructive",
      });
      return;
    }

    // Validate SA phone number format (starts with 27 and 11 digits total)
    const phoneRegex = /^27\d{9}$/;
    if (!phoneRegex.test(phoneReference)) {
      toast({
        title: "Invalid Phone Format",
        description: "Phone reference must be in format 27xxxxxxxxx (e.g., 27661984406)",
        variant: "destructive",
      });
      return;
    }

    depositMutation.mutate({ amount, phoneReference });
  };

  const handleAmountChange = (value: string) => {
    // Only allow numbers and decimal point
    const sanitized = value.replace(/[^0-9.]/g, '');
    
    // Prevent multiple decimal points
    const parts = sanitized.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts[1] && parts[1].length > 2) {
      return;
    }
    
    setAmount(sanitized);
  };

  const quickAmounts = [100, 500, 1000, 5000];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]" data-testid="modal-deposit">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5" />
            <span>Deposit ZAR</span>
          </DialogTitle>
          <DialogDescription>
            Add funds to your account to start trading cryptocurrencies
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Payment Method Selection */}
          <div className="space-y-3">
            <Label>Payment Method</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`
                  flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all
                  ${paymentMethod === "card" 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/30"
                  }
                `}
                onClick={() => setPaymentMethod("card")}
                data-testid="button-payment-card"
              >
                <CreditCard className="h-4 w-4" />
                <span className="text-sm font-medium">Card</span>
              </button>
              <button
                type="button"
                className={`
                  flex items-center justify-center space-x-2 p-3 rounded-lg border transition-all
                  ${paymentMethod === "bank" 
                    ? "border-primary bg-primary/5 text-primary" 
                    : "border-border hover:border-primary/30"
                  }
                `}
                onClick={() => setPaymentMethod("bank")}
                data-testid="button-payment-bank"
              >
                <span className="text-sm font-bold">🏦</span>
                <span className="text-sm font-medium">Bank</span>
              </button>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-3">
            <Label htmlFor="amount">Amount (ZAR)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                R
              </span>
              <Input
                id="amount"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-8"
                data-testid="input-deposit-amount"
              />
            </div>
            
            {/* Quick Amount Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {quickAmounts.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setAmount(quickAmount.toString())}
                  className="text-xs"
                  data-testid={`button-quick-${quickAmount}`}
                >
                  R{quickAmount}
                </Button>
              ))}
            </div>
          </div>

          {/* Phone Reference */}
          <div className="space-y-2">
            <Label htmlFor="phone-reference">Phone Reference</Label>
            <Input
              id="phone-reference"
              type="text"
              placeholder="27661984406"
              value={phoneReference}
              onChange={(e) => {
                // Only allow numbers and ensure it starts with 27
                const value = e.target.value.replace(/[^0-9]/g, '');
                if (value === '' || value.startsWith('27')) {
                  setPhoneReference(value);
                }
              }}
              maxLength={11}
              className="font-mono"
              data-testid="input-phone-reference"
            />
            <p className="text-xs text-muted-foreground">
              Enter your South African phone number (format: 27xxxxxxxxx)
            </p>
          </div>

          {/* Deposit Info */}
          {amount && parseFloat(amount) > 0 && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Deposit Amount:</span>
                <span className="font-medium" data-testid="text-deposit-amount">
                  R{parseFloat(amount).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Processing Fee:</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t pt-2">
                <span>Total:</span>
                <span data-testid="text-deposit-total">
                  R{parseFloat(amount).toFixed(2)}
                </span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={depositMutation.isPending}
              data-testid="button-cancel-deposit"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!amount || parseFloat(amount) <= 0 || !phoneReference || depositMutation.isPending}
              data-testid="button-confirm-deposit"
            >
              {depositMutation.isPending ? "Processing..." : "Deposit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}