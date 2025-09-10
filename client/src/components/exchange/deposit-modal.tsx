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
import { DollarSign } from "lucide-react";

// Demo user ID for development
const DEMO_USER_ID = "demo-user-123";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const [amount, setAmount] = useState("");
  const [phoneReference, setPhoneReference] = useState("");
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
        
        <div className="space-y-6">
          {/* Bank Deposit Instructions */}
          <div className="space-y-4">
            <div className="p-4 bg-muted border border-border rounded-lg">
              <h4 className="font-medium text-base mb-3">Deposit funds to:</h4>
              <div className="text-sm space-y-2">
                <p><strong>Standard Bank South Africa</strong></p>
                <p><strong>Account number:</strong> <span className="font-mono">070220808</span></p>
                <p><strong>Ref Number:</strong> <span className="font-mono">{phoneReference || "0661984607"}</span></p>
              </div>
              <div className="mt-4 text-xs text-muted-foreground space-y-1">
                <p><strong>*Note:</strong> If your reference number is incorrect it will cause delays.</p>
                <p><strong>**Instant payments</strong> take 10-30min during working hours.</p>
                <p><strong>***Regular payments</strong> reflect in 24-48 hours.</p>
              </div>
            </div>
          </div>


          <DialogFooter>
            <Button
              onClick={onClose}
              data-testid="button-close-deposit"
            >
              Close
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}