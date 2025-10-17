import { Menu, X, LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BalanceDisplay } from "./balance-display";
import { useAuth } from "@/lib/auth";
import { LoginDialog } from "@/components/auth/login-dialog";
import { RegisterDialog } from "@/components/auth/register-dialog";
import { useState } from "react";

interface MobileHeaderProps {
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  onDepositClick?: () => void;
}

export function MobileHeader({ isMobileMenuOpen, setIsMobileMenuOpen, onDepositClick }: MobileHeaderProps) {
  const { isAuthenticated } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

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
        
        {/* Signin/Signup Buttons for unauthenticated users */}
        {!isAuthenticated ? (
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLoginDialog(true)}
              data-testid="button-mobile-signin"
              className="h-8 px-2"
            >
              <LogIn className="h-4 w-4" />
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => setShowRegisterDialog(true)}
              data-testid="button-mobile-signup"
              className="h-8 px-2"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="w-6" />
        )}
      </header>
      
      {/* Mobile Balance Display */}
      <div className="p-4 border-b border-border bg-card/50">
        <BalanceDisplay 
          variant="mobile" 
          onDepositClick={onDepositClick}
        />
      </div>

      {/* Auth Dialogs */}
      <LoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onSwitchToRegister={() => {
          setShowLoginDialog(false);
          setShowRegisterDialog(true);
        }}
      />

      <RegisterDialog
        open={showRegisterDialog}
        onOpenChange={setShowRegisterDialog}
        onSwitchToLogin={() => {
          setShowRegisterDialog(false);
          setShowLoginDialog(true);
        }}
      />
    </div>
  );
}
