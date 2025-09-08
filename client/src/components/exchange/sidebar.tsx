import { Home, Compass, Search, BarChart3, Wallet, Zap, Users, HelpCircle, User, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { RegisterDialog } from "@/components/auth/register-dialog";

interface SidebarProps {
  className?: string;
  isMobile?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const navigationItems = [
  { icon: Home, label: "Home", href: "/" },
  { icon: Compass, label: "Explore", href: "/explore" },
  { icon: Wallet, label: "Wallets", href: "/wallets" },
  { icon: Zap, label: "Shitcoins", href: "/shitcoins" },
  { icon: BarChart3, label: "Activity", href: "/activity" },
];

const portfolioItems = [
  { icon: "₿", label: "Bitcoin", amount: "0.0234", color: "text-orange-500" },
  { icon: "Ξ", label: "Ethereum", amount: "1.247", color: "text-blue-400" },
];

const bottomItems = [
  { icon: Users, label: "Referrals" },
  { icon: HelpCircle, label: "Help" },
  { icon: User, label: "Profile" },
];

export function Sidebar({ className, isMobile, isOpen, onClose }: SidebarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  const NavItem = ({ 
    icon: Icon, 
    label, 
    href,
    amount, 
    color 
  }: { 
    icon: any; 
    label: string; 
    href?: string;
    amount?: string; 
    color?: string; 
  }) => {
    const [location] = useLocation();
    const active = href && location === href;
    
    const content = (
      <>
        {typeof Icon === "string" ? (
          <span className={cn("w-5 text-center font-mono", color)}>{Icon}</span>
        ) : (
          <Icon className="w-5 h-5" />
        )}
        <span>{label}</span>
        {amount && (
          <span className="ml-auto text-xs font-mono" data-testid={`amount-${label.toLowerCase()}`}>
            {amount}
          </span>
        )}
      </>
    );

    if (href) {
      return (
        <Link href={href}>
          <div
            className={cn(
              "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors cursor-pointer",
              active
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            )}
            onClick={isMobile ? onClose : undefined}
            data-testid={`nav-${label.toLowerCase()}`}
          >
            {content}
          </div>
        </Link>
      );
    }

    return (
      <button
        className={cn(
          "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors",
          "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
        )}
        onClick={isMobile ? onClose : undefined}
        data-testid={`nav-${label.toLowerCase()}`}
      >
        {content}
      </button>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center space-x-2 p-6 border-b border-border">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-primary-foreground" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          </svg>
        </div>
        <span className="text-lg font-semibold" data-testid="text-brand">Exchange</span>
      </div>
      
      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
        
        <div className="py-2">
          <div className="h-px bg-border" />
        </div>
        
        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Your Portfolio
        </div>
        
        {portfolioItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}
      </nav>
      
      <div className="border-t border-border p-4 space-y-1">
        {isAuthenticated ? (
          <>
            {/* User Profile Section */}
            <div className="flex items-center space-x-3 px-3 py-2.5 mb-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={user?.profile_image_url} />
                <AvatarFallback>
                  {user?.first_name?.[0]}{user?.last_name?.[0]} || {user?.email?.[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}` 
                    : user?.email}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Bottom Navigation Items */}
            {bottomItems.map((item) => (
              <NavItem key={item.label} {...item} />
            ))}

            {/* Logout Button */}
            <Button
              variant="ghost"
              className="w-full justify-start px-3 py-2.5 h-auto text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
              onClick={logout}
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Button>
          </>
        ) : (
          <>
            {/* Login/Register Buttons for unauthenticated users */}
            <Button
              variant="default"
              className="w-full justify-start px-3 py-2.5 h-auto"
              onClick={() => setShowLoginDialog(true)}
              data-testid="button-show-login"
            >
              <LogIn className="w-5 h-5 mr-3" />
              Login
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start px-3 py-2.5 h-auto"
              onClick={() => setShowRegisterDialog(true)}
              data-testid="button-show-register"
            >
              <User className="w-5 h-5 mr-3" />
              Sign Up
            </Button>
          </>
        )}
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

  if (isMobile) {
    return (
      <>
        {/* Overlay */}
        {isOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={onClose}
            data-testid="mobile-overlay"
          />
        )}
        
        {/* Mobile Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border lg:hidden transition-transform duration-300 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full",
            className
          )}
          data-testid="mobile-sidebar"
        >
          {content}
        </aside>
      </>
    );
  }

  return (
    <aside className={cn("w-64 bg-card border-r border-border", className)} data-testid="desktop-sidebar">
      {content}
    </aside>
  );
}
