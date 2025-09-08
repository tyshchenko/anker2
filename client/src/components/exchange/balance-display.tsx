import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Demo user ID for development
const DEMO_USER_ID = "demo-user-123";

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
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/users', DEMO_USER_ID],
    queryFn: async () => {
      const response = await fetch(`/api/users/${DEMO_USER_ID}`);
      if (!response.ok) {
        // If user doesn't exist, create a demo user
        if (response.status === 404) {
          const createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              username: 'demo-user',
              password: 'demo-password'
            })
          });
          if (createResponse.ok) {
            return createResponse.json();
          }
        }
        throw new Error('Failed to fetch user');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const balance = user?.zarBalance || "0.00";
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
  );
}