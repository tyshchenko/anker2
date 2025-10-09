import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Plus, Shield, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useWallets } from "@/hooks/useWallets";
import { VerificationModal } from "@/components/verification/verification-modal";

interface BalanceDisplayProps {
  showDepositButton?: boolean;
  variant?: "mobile" | "desktop";
  onDepositClick?: () => void;
}

export function BalanceDisplay({ 
  showDepositButton = true, 
  variant = "desktop",
  onDepositClick 
}: BalanceDisplayProps) {
  const { user: authUser } = useAuth();
  const [showVerificationModal, setShowVerificationModal] = useState(false);

  // Fetch user wallets
  const { data: walletsData, isLoading } = useWallets();

  // Find ZAR wallet balance
  const zarWallet = walletsData?.wallets.find(wallet => wallet.coin === 'ZAR');
  const balance = zarWallet?.balance || "0.00";
  const formattedBalance = parseFloat(balance).toLocaleString('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  });

  if (variant === "mobile") {
    return (
      <div className="flex items-center space-x-2" data-testid="balance-mobile">
        <Wallet className="h-4 w-4 text-muted-foreground" />
        <div className="text-sm">
          <span className="text-muted-foreground">Balance: </span>
          <span className="font-semibold text-foreground" data-testid="text-balance">
            {isLoading ? "..." : formattedBalance}
          </span>
        </div>
        {/* Verification Status/Button */}
        {authUser?.verification_level === "advanced" ? (
          <div className="flex items-center space-x-1 text-green-600">
            <CheckCircle className="h-3 w-3" />
            <span className="text-xs font-medium">Verified</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVerificationModal(true)}
            className="h-6 px-2"
            data-testid="button-verification-mobile"
          >
            <Shield className="h-3 w-3" />
          </Button>
        )}

        {showDepositButton && (
          <Button
            variant="outline"
            size="sm"
            onClick={onDepositClick}
            className="h-6 px-2"
            data-testid="button-deposit-mobile"
          >
            <Plus className="h-3 w-3" />
          </Button>
        )}
        <VerificationModal
          open={showVerificationModal}
          onOpenChange={setShowVerificationModal}
        />
      </div>
    );
  }

  return (
    <div 
      className="hidden lg:flex items-center justify-between p-4 border-b border-border bg-card"
      data-testid="balance-desktop"
    >
      <div className="flex items-center space-x-3">
        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
          <Wallet className="h-4 w-4 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">ZAR Balance</p>
          <p className="text-lg font-semibold" data-testid="text-balance-amount">
            {isLoading ? "Loading..." : formattedBalance}
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Verification Status/Button */}
        {authUser?.verification_level === "advanced" ? (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">Verified</span>
          </div>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowVerificationModal(true)}
            className="flex items-center space-x-2"
            data-testid="button-verification"
          >
            <Shield className="h-4 w-4" />
            <span>
              {authUser?.verification_level === "submitted" ? "Verifying..." : 
               authUser?.verification_level === "rejected" ? "Resubmit" : 
               "Verify Account"}
            </span>
          </Button>
        )}

        {showDepositButton && (
          <Button
            variant="default"
            size="sm"
            onClick={onDepositClick}
            className="flex items-center space-x-2"
            data-testid="button-deposit-desktop"
          >
            <Plus className="h-4 w-4" />
            <span>Deposit</span>
          </Button>
        )}
      </div>

      <VerificationModal
        open={showVerificationModal}
        onOpenChange={setShowVerificationModal}
      />
    </div>
  );
}
