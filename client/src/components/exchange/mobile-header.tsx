import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceDisplay } from "./balance-display";

interface MobileHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onDepositClick?: () => void;
}

export function MobileHeader({ isMobileMenuOpen, setIsMobileMenuOpen, onDepositClick }: MobileHeaderProps) {
  return (
    <div className="lg:hidden">
      <header className="flex items-center justify-between p-4 border-b border-border bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          data-testid="button-mobile-menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </Button>
        
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
            <svg className="w-3 h-3 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
            </svg>
          </div>
          <span className="font-semibold" data-testid="text-brand">Exchange</span>
        </div>
        
        <div className="w-6" />
      </header>
      
      {/* Mobile Balance Display */}
      <div className="p-4 border-b border-border bg-card/50">
        <BalanceDisplay 
          variant="mobile" 
          onDepositClick={onDepositClick}
        />
      </div>
    </div>
  );
}
