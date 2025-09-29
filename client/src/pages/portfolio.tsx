import { useState, useEffect } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { PortfolioPanel } from "@/components/exchange/portfolio-panel";
import { TradingPanel } from "@/components/exchange/trading-panel";
import { DepositModal } from "@/components/exchange/deposit-modal";

export default function PortfolioPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPair, setCurrentPair] = useState("BTC/ZAR");
  const [showDepositModal, setShowDepositModal] = useState(false);

  // Handle pair changes from trading panel
  const handlePairChange = (from: string, to: string, action: "buy" | "sell" | "convert") => {
    let pair;
    if (action === "buy") pair = `${to}/${from}`;
    else if (action === "sell") pair = `${from}/${to}`;
    else {
      // For convert, prioritize crypto assets for chart display
      const cryptoAssets = ["BTC", "ETH", "USDT"];

      if (cryptoAssets.includes(from)) pair = `${from}/ZAR`;
      else if (cryptoAssets.includes(to)) pair = `${to}/ZAR`;
      else pair = `${from}/${to}`;
    }

    setCurrentPair(pair);
  };

  // Close mobile menu when clicking outside or on navigation
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleDepositClick = () => {
    setShowDepositModal(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex min-h-screen">
        {/* Desktop Sidebar */}
        <div className="hidden lg:block">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sidebar
          isMobile
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-screen">
          {/* Center Panel - Portfolio */}
          <main className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <MobileHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              onDepositClick={handleDepositClick}
            />

            {/* Portfolio Section */}
            <PortfolioPanel />
          </main>

          {/* Trading Panel */}
          <TradingPanel onPairChange={handlePairChange} />
        </div>

        {/* Deposit Modal */}
        <DepositModal 
          isOpen={showDepositModal}
          onClose={() => setShowDepositModal(false)}
        />
      </div>
    </div>
  );
}