import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
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
import { Banknote } from "lucide-react";
import { SOFVerificationDialog } from "./sof-verification-dialog";

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DepositModal({ isOpen, onClose }: DepositModalProps) {
  const { user } = useAuth();
  const [amount, setAmount] = useState("");
  const [phoneReference, setPhoneReference] = useState("");
  const [showSOFDialog, setShowSOFDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const depositMutation = useMutation({
    mutationFn: async (data: { amount: string; phoneReference: string }) => {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }
      const response = await fetch(`/api/users/${user.id}/deposit`, {
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
      queryClient.invalidateQueries({ queryKey: ['/api/wallets'] });

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


  // Check SOF status when modal opens
  if (isOpen && user && user.sof === false && !showSOFDialog) {
    setShowSOFDialog(true);
    return (
      <>
        <SOFVerificationDialog
          isOpen={showSOFDialog}
          onSuccess={() => {
            setShowSOFDialog(false);
          }}
        />
      </>
    );
  }

  return (
    <>
      <SOFVerificationDialog
        isOpen={showSOFDialog}
        onSuccess={() => {
          setShowSOFDialog(false);
        }}
      />
      <Dialog open={isOpen && !showSOFDialog} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh]" data-testid="modal-deposit">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2 text-xl">
              <Banknote className="h-6 w-6" />
              <span>Deposit ZAR</span>
            </DialogTitle>
            <DialogDescription className="text-base">
              Add funds to your account to start trading cryptocurrencies
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-8">
            {/* Bank Deposit Instructions */}
            <div className="space-y-6">
              <div className="p-6 bg-muted border border-border rounded-lg">
                <h4 className="font-semibold text-lg mb-4">Deposit funds to:</h4>
                <div className="space-y-3 text-base">
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">Bank:</span>
                    <span className="font-semibold text-lg">Standard Bank South Africa</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">Account Number:</span>
                    <span className="font-mono text-lg font-semibold">070220808</span>
                  </div>
                  <div className="flex flex-col space-y-1">
                    <span className="text-muted-foreground">Reference Number:</span>
                    <span className="font-mono text-lg font-semibold text-primary">{user?.reference || ""}</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-background rounded-lg border space-y-2">
                  <div className="flex items-start space-x-2">
                    <span className="text-amber-600 font-bold">⚠️</span>
                    <p className="text-sm"><strong>Important:</strong> If your reference number is incorrect it will cause delays.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-green-600 font-bold">⚡</span>
                    <p className="text-sm"><strong>Instant payments</strong> take 10-30min during working hours.</p>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-600 font-bold">🕐</span>
                    <p className="text-sm"><strong>Regular payments</strong> reflect in 24-48 hours.</p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={onClose}
                size="lg"
                className="w-full sm:w-auto"
                data-testid="button-close-deposit"
              >
                Close
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
