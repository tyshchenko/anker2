import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { LoginDialog } from "@/components/auth/login-dialog";
import { RegisterDialog } from "@/components/auth/register-dialog";
import NotFound from "@/pages/not-found";
import ExchangePage from "@/pages/exchange";
import PortfolioPage from "@/pages/portfolio";
import ExplorePage from "@/pages/explore";
import WalletsPage from "@/pages/wallets";
import WalletDetailPage from "@/pages/wallet-detail";
import SendPage from "@/pages/send";
import ReceivePage from "@/pages/receive";
import ShitcoinsPage from "@/pages/shitcoins";
import ActivityPage from "@/pages/activity";
import HelpPage from "@/pages/help";
import ProfilePage from "@/pages/profile";
import SignInPage from "@/pages/signin";
import RegisterPage from "@/pages/register";
import CreateWalletPage from "@/pages/create-wallet";

// Declare social login objects for TypeScript
declare global {
  interface Window {
    google: any;
    FB: any;
  }
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show login dialog automatically if not authenticated and trying to access protected routes
  const handleProtectedRoute = (component: React.ReactNode) => {
    if (isAuthenticated) {
      return component;
    } else {
      if (!showLoginDialog && !showRegisterDialog) {
        setShowLoginDialog(true);
      }
      return <ExchangePage />;
    }
  };

  return (
    <>
      <Switch>
        <Route path="/" component={() => isAuthenticated ? <WalletsPage /> : <PortfolioPage />} />
        <Route path="/exchange" component={ExchangePage} />
        <Route path="/explore" component={ExplorePage} />
        <Route path="/wallets" component={() => handleProtectedRoute(<WalletsPage />)} />
        <Route path="/wallets/:coin" component={() => handleProtectedRoute(<WalletDetailPage />)} />
        <Route path="/send" component={() => handleProtectedRoute(<SendPage />)} />
        <Route path="/receive" component={() => handleProtectedRoute(<ReceivePage />)} />
        <Route path="/shitcoins" component={ShitcoinsPage} />
        <Route path="/activity" component={() => handleProtectedRoute(<ActivityPage />)} />
        <Route path="/help" component={HelpPage} />
        <Route path="/profile" component={() => handleProtectedRoute(<ProfilePage />)} />
        <Route path="/signin" component={SignInPage} />
        <Route path="/signup" component={RegisterPage} />
        <Route path="/create-wallet" component={() => handleProtectedRoute(<CreateWalletPage />)} />
        <Route component={NotFound} />
      </Switch>

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
    </>
  );
}

function App() {

  useEffect(() => {

    // Load Google Identity Services script
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    // Load Facebook SDK
    if (!window.FB) {
      const script = document.createElement('script');
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        window.FB.init({
          appId: 'YOUR_FACEBOOK_APP_ID', // This should come from environment
          cookie: true,
          xfbml: true,
          version: 'v18.0'
        });
      };
      document.head.appendChild(script);
    }
  }, []);
  
    return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
