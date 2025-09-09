import { useState, useEffect, useMemo } from "react";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { ChartPanel } from "@/components/exchange/chart-panel";
import { TradingPanel } from "@/components/exchange/trading-panel";
import { BalanceDisplay } from "@/components/exchange/balance-display";
import { DepositModal } from "@/components/exchange/deposit-modal";

export default function ExchangePage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentPair, setCurrentPair] = useState("BTC/ZAR");
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);
  const [showDepositModal, setShowDepositModal] = useState(false);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const ws = new WebSocket(wsUrl);
    
    ws.onopen = () => {
      console.log("WebSocket connected");
      setWsConnection(ws);
    };
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "price_update") {
          // Handle real-time price updates
          console.log("Price update received:", data.data);
        }
      } catch (error) {
        console.error("Invalid WebSocket message:", error);
      }
    };
    
    ws.onclose = () => {
      console.log("WebSocket disconnected");
      setWsConnection(null);
    };
    
    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    return () => {
      ws.close();
    };
  }, []);

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
          {/* Center Panel - Chart and Market Data */}
          <main className="flex-1 flex flex-col">
            {/* Mobile Header */}
            <MobileHeader
              isMobileMenuOpen={isMobileMenuOpen}
              setIsMobileMenuOpen={setIsMobileMenuOpen}
              onDepositClick={handleDepositClick}
            />

            {/* Desktop Balance Display */}
            <BalanceDisplay 
              variant="desktop" 
              onDepositClick={handleDepositClick}
            />


            {/* Chart Section */}
            <ChartPanel currentPair={currentPair} />
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
