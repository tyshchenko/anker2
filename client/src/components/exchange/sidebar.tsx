import { Home, Compass, Search, BarChart3, Wallet, Zap, Users, HelpCircle, User, LogIn, LogOut } from "lucide-react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useWallets } from "@/hooks/useWallets";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { LoginDialog } from "@/components/auth/login-dialog";
import { RegisterDialog } from "@/components/auth/register-dialog";
import ankerPayLogo from "@assets/AnkerPay Logo PNG 300x300 1_1757407958939.png";
import btcLogo from "@assets/BTC_1757408297384.png";
import ethLogo from "@assets/ETH_1757408297384.png";
import usdtLogo from "@assets/tether-usdt-logo_1757408297385.png";
import xrpLogo from "@assets/XRP_1757408614597.png";
import bnbLogo from "@assets/BNB_1757408614597.png";
import dogeLogo from "@assets/Dogecoin_1757409584282.png";
import solLogo from "@assets/SOL_1757408614598.png";
import polygonLogo from "@assets/Polygon_1757409292577.png";
import cardanoLogo from "@assets/Cardano_1757409292578.png";

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
  { icon: Zap, label: "Shitcoins", href: "/shitcoins", comingSoon: true },
  { icon: BarChart3, label: "Activity", href: "/activity" },
];

const portfolioItems = [
  { icon: "₿", label: "Bitcoin", amount: "0.0234", color: "text-orange-500", href: "/wallets/btc", logoUrl: btcLogo },
  { icon: "Ξ", label: "Ethereum", amount: "1.247", color: "text-blue-400", href: "/wallets/eth", logoUrl: ethLogo },
  { icon: "₮", label: "Tether", amount: "0", color: "text-green-500", href: "/wallets/usdt", logoUrl: usdtLogo },
  { icon: "◉", label: "BNB", amount: "0", color: "text-yellow-500", href: "/wallets/bnb", logoUrl: bnbLogo },
  { icon: "◎", label: "Solana", amount: "0", color: "text-purple-500", href: "/wallets/sol", logoUrl: solLogo },
  { icon: "◈", label: "XRP", amount: "0", color: "text-blue-600", href: "/wallets/xrp", logoUrl: xrpLogo },
  { icon: "◇", label: "Cardano", amount: "0", color: "text-blue-500", href: "/wallets/ada", logoUrl: cardanoLogo },
  { icon: "◆", label: "Avalanche", amount: "0", color: "text-red-500", href: "/wallets/avax" },
  { icon: "◊", label: "Dogecoin", amount: "0", color: "text-yellow-600", href: "/wallets/doge", logoUrl: dogeLogo },
  { icon: "⬟", label: "Polygon", amount: "0", color: "text-purple-600", href: "/wallets/matic", logoUrl: polygonLogo },
];

const bottomItems = [
  { icon: Users, label: "Referrals" },
  { icon: HelpCircle, label: "Help", href: "/help" },
  { icon: User, label: "Profile", href: "/profile" },
];

export function Sidebar({ className, isMobile, isOpen, onClose }: SidebarProps) {
  const { isAuthenticated, user, logout } = useAuth();
  const { data: walletsData, isLoading: walletsLoading } = useWallets();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  // Map wallet data to portfolio items with real balances
  const getPortfolioItems = () => {
    if (!walletsData?.wallets) return portfolioItems.map(item => ({ ...item, amount: "0" }));
    
    return portfolioItems.map(portfolioItem => {
      // Find matching wallet by coin symbol
      const wallet = walletsData.wallets.find(w => 
        w.coin.toLowerCase() === portfolioItem.label.toLowerCase().slice(0, 3) ||
        w.coin.toLowerCase() === portfolioItem.label.toLowerCase() ||
        (portfolioItem.label === "Bitcoin" && w.coin.toLowerCase() === "btc") ||
        (portfolioItem.label === "Ethereum" && w.coin.toLowerCase() === "eth") ||
        (portfolioItem.label === "Tether" && w.coin.toLowerCase() === "usdt") ||
        (portfolioItem.label === "BNB" && w.coin.toLowerCase() === "bnb") ||
        (portfolioItem.label === "Solana" && w.coin.toLowerCase() === "sol") ||
        (portfolioItem.label === "XRP" && w.coin.toLowerCase() === "xrp") ||
        (portfolioItem.label === "Cardano" && w.coin.toLowerCase() === "ada") ||
        (portfolioItem.label === "Avalanche" && w.coin.toLowerCase() === "avax") ||
        (portfolioItem.label === "Dogecoin" && w.coin.toLowerCase() === "doge") ||
        (portfolioItem.label === "Polygon" && w.coin.toLowerCase() === "matic")
      );
      
      return {
        ...portfolioItem,
        amount: wallet ? parseFloat(wallet.balance).toFixed(4) : "0"
      };
    });
  };

  const realPortfolioItems = getPortfolioItems();

  const NavItem = ({ 
    icon: Icon, 
    label, 
    href,
    amount, 
    color,
    comingSoon,
    logoUrl
  }: { 
    icon: any; 
    label: string; 
    href?: string;
    amount?: string; 
    color?: string; 
    comingSoon?: boolean;
    logoUrl?: string;
  }) => {
    const [location] = useLocation();
    const active = href && location === href;

    const content = (
      <>
        {typeof Icon === "string" ? (
          logoUrl ? (
            <div className="w-5 h-5 flex items-center justify-center">
              <img 
                src={logoUrl} 
                alt={`${label} logo`} 
                className="w-4 h-4 rounded-full object-contain"
              />
            </div>
          ) : (
            <span className={cn("w-5 text-center font-mono", color)}>{Icon}</span>
          )
        ) : (
          <Icon className="w-5 h-5" />
        )}
        <span>{label}</span>
        {amount && (
          <span className="ml-auto text-xs font-mono" data-testid={`amount-${label.toLowerCase()}`}>
            {amount}
          </span>
        )}
        {comingSoon && (
          <span className="ml-auto bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs font-medium">
            Coming Soon
          </span>
        )}
      </>
    );

    if (href && !comingSoon) {
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
      <div
        className={cn(
          "flex items-center space-x-3 px-3 py-2.5 rounded-lg text-left w-full transition-colors",
          comingSoon 
            ? "text-muted-foreground cursor-not-allowed opacity-75" 
            : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground cursor-pointer"
        )}
        onClick={!comingSoon ? (isMobile ? onClose : undefined) : undefined}
        data-testid={`nav-${label.toLowerCase()}`}
      >
        {content}
      </div>
    );
  };

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center space-x-2 p-6 border-b border-border">
        <img 
          src={ankerPayLogo} 
          alt="AnkerPay Logo" 
          className="w-8 h-8 rounded-lg"
        />
        <span className="text-lg font-semibold" data-testid="text-brand">AnkerPay</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navigationItems.map((item) => (
          <NavItem key={item.label} {...item} />
        ))}

        <div className="py-2">
          <div className="h-px bg-border" />
        </div>

        {isAuthenticated ? (
          <>
            <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Your Portfolio
            </div>

            {walletsLoading ? (
              <div className="px-3 py-2 text-sm text-muted-foreground">
                Loading wallets...
              </div>
            ) : (
              realPortfolioItems.map((item) => (
                <NavItem key={item.label} {...item} />
              ))
            )}
          </>
        ):(
          <></>
        )}
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
              Sign Out
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
              Sign In
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
