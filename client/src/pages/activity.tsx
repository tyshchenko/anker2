import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWithAuth } from "@/lib/queryClient";
import { Sidebar } from "@/components/exchange/sidebar";
import { MobileHeader } from "@/components/exchange/mobile-header";
import { MarketTicker } from "@/components/exchange/market-ticker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Filter, 
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Clock
} from "lucide-react";
import { useAuth } from "@/lib/auth";

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'convert' | 'send' | 'receive';
  pair: string;
  amount: number;
  price: number;
  total: number;
  fee: number;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
}

// Trade interface from server
interface Trade {
  id: string;
  type: "buy" | "sell" | "convert";
  from_asset: string;
  to_asset: string;
  from_amount: number;
  to_amount: number;
  rate: number;
  fee: number;
  status: "pending" | "completed" | "failed";
  created_at: string;
}

// Server transaction interface (for send/receive operations)
interface ServerTransaction {
  id?: string;
  user_id: string;
  coin: string;
  side: 'send' | 'receive';
  amount: string;
  price: string;
  txhash: string;
  txtype: string;
  status?: 'pending' | 'completed' | 'failed';
  created_at?: string;
}

// Convert server trade data to frontend transaction format
const mapTradeToTransaction = (trade: Trade): Transaction => {
  return {
    id: trade.id,
    type: trade.type,
    pair: `${trade.from_asset}/${trade.to_asset}`,
    amount: trade.from_amount,
    price: trade.rate,
    total: trade.to_amount,
    fee: trade.fee,
    status: trade.status,
    created_at: trade.created_at,
  };
};

// Convert server transaction data to frontend transaction format
const mapServerTransactionToTransaction = (serverTx: ServerTransaction): Transaction => {
  return {
    id: serverTx.id || `tx-${Date.now()}`,
    type: serverTx.side.toLowerCase() || 'send',
    pair: serverTx.coin,
    amount: parseFloat(serverTx.amount),
    price: parseFloat(serverTx.price),
    total: parseFloat(serverTx.amount),
    fee: 0, // Assuming no fee for direct transactions unless specified
    status: serverTx.status || 'completed',
    created_at: serverTx.created_at || new Date().toISOString(),
  };
};

// Hook to fetch user trades
const useUserTrades = (userId: string | null) => {
  return useQuery({
    queryKey: ['/api/trades', userId],
    queryFn: async (): Promise<Transaction[]> => {
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      const response = await fetchWithAuth(`/api/trades/${userId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trades');
      }
      
      const data = await response.json();
      return data.data ? data.data.map(mapTradeToTransaction) : [];
    },
    enabled: !!userId,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: true, // Force refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid too many requests
  });
};

// Hook to fetch user transactions
const useUserTransactions = (userId: string | null) => {
  return useQuery({
    queryKey: ['/api/transactions', userId],
    queryFn: async (): Promise<Transaction[]> => {
      if (!userId) {
        throw new Error('User ID not available');
      }
      
      const response = await fetchWithAuth(`/api/transactions/${userId}`, {
        method: 'GET',
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      return data.data ? data.data.map(mapServerTransactionToTransaction) : [];

    },
    enabled: !!userId,
    staleTime: 0, // Always refetch when component mounts
    refetchOnMount: true, // Force refetch on mount
    refetchOnWindowFocus: false, // Don't refetch on window focus to avoid too many requests
  });
};

interface TransactionRowProps {
  transaction: Transaction;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-ZA', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, symbol: string) => {
    if (symbol) {
      if (symbol.includes('BTC')) return amount.toFixed(7);
      if (symbol.includes('ETH')) return amount.toFixed(6);
      if (symbol.includes('ZAR') || symbol.includes('USD')) return amount.toFixed(2);
      return amount.toFixed(4);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'buy':
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case 'sell':
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case 'send':
        return <ArrowUpRight className="w-4 h-4 text-blue-600" />;
      case 'receive':
        return <ArrowDownLeft className="w-4 h-4 text-purple-600" />;
      case 'convert':
        return <ArrowUpRight className="w-4 h-4 text-orange-600" />;
      case 'withdraw':
        return <ArrowUpRight className="w-4 h-4 text-red-500" />;
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-500" />;
      case 'fee':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="secondary" className="text-green-700 bg-green-100">Completed</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-700 bg-yellow-100">Pending</Badge>;
      case 'failed':
        return <Badge variant="secondary" className="text-red-700 bg-red-100">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDescription = () => {
    if (transaction.type === 'convert') {
      return `Convert ${transaction.pair}`;
    }
    if (transaction.type === 'withdraw') {
      return `Withdraw`;
    }
    if (transaction.type === 'deposit') {
      return `Deposit`;
    }
    if (transaction.type === 'fee') {
      return `Fee`;
    }

    return `${transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)} ${transaction.pair}`;
  };

  return (
    <div className="flex items-center justify-between p-4 border-b border-border hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-4">
        <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
          {getTypeIcon(transaction.type)}
        </div>
        <div>
          <p className="font-medium" data-testid={`transaction-desc-${transaction.id}`}>
            {getDescription()}
          </p>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <span data-testid={`transaction-date-${transaction.id}`}>
              {formatDate(transaction.created_at)}
            </span>
            <span>•</span>
            <span data-testid={`transaction-id-${transaction.id}`}>
              {transaction.id}
            </span>
          </div>
        </div>
      </div>

      <div className="text-right">
        <div className="flex items-center space-x-3">
          { transaction.amount !== undefined && transaction.amount !== null ? (
            <>
              <div>
                <p className="font-medium" data-testid={`transaction-amount-${transaction.id}`}>
                  {formatAmount(transaction.amount, transaction.pair)} {transaction.pair.split('/')[0] || transaction.pair}
                </p>
                <p className="text-sm text-muted-foreground">
                  ZAR {(() => {
                    const fromAsset = transaction.pair.split('/')[0];
                    const toAsset = transaction.pair.split('/')[1];
                    if (fromAsset === 'ZAR') {
                      return transaction.amount.toLocaleString();
                    } else if (toAsset === 'ZAR') {
                      return transaction.total.toLocaleString();
                    }
                    return '0';
                  })()}
                </p>
              </div>
              {getStatusBadge(transaction.status)}
            </>
            ) : '' }
        </div>
      </div>
    </div>
  );
}

export default function ActivityPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  
  const { user } = useAuth();
  const { data: tradesData, isLoading: tradesLoading, isError: tradesError } = useUserTrades(user?.id?.toString() || null);
  const { data: transactionsData, isLoading: transactionsLoading, isError: transactionsError } = useUserTransactions(user?.id?.toString() || null);
  
  // Combine trades and transactions, remove duplicates by ID
  const allTransactions = [
    ...(tradesData || []),
    ...(transactionsData || [])
  ].filter((transaction, index, self) => 
    index === self.findIndex(t => t.id === transaction.id)
  );
  
  const isLoading = tradesLoading || transactionsLoading;
  const isError = tradesError || transactionsError;
  const transactions = allTransactions;

  const filteredTransactions = transactions
    .filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false;
      if (filterStatus !== 'all' && tx.status !== filterStatus) return false;
      if (searchQuery && !tx.pair.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !tx.id.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'amount-high':
          return b.total - a.total;
        case 'amount-low':
          return a.total - b.total;
        default:
          return 0;
      }
    });

  const stats = {
    totalTransactions: transactions.length,
    completedTransactions: transactions.filter(tx => tx.status === 'completed').length,
    totalVolume: transactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + Math.abs(tx.total), 0),
    totalFees: transactions
      .filter(tx => tx.status === 'completed')
      .reduce((sum, tx) => sum + tx.fee, 0)
  };

  const exportToCSV = () => {
    const headers = [
      'Transaction ID',
      'Date',
      'Type',
      'Pair/Asset',
      'Amount',
      'Price (ZAR)',
      'Total (ZAR)',
      'Fee (ZAR)',
      'Status',
    ];

    const csvData = filteredTransactions.map(tx => [
      tx.id,
      new Date(tx.created_at).toLocaleString('en-ZA'),
      tx.type.charAt(0).toUpperCase() + tx.type.slice(1),
      tx.pair,
      tx.amount,
      tx.price,
      tx.total,
      tx.fee,
      tx.status.charAt(0).toUpperCase() + tx.status.slice(1),
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => 
        typeof field === 'string' && field.includes(',') 
          ? `"${field}"` 
          : field
      ).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex-1 flex flex-col min-h-screen">
          {/* Mobile Header */}
          <MobileHeader
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />

          {/* Market Ticker */}
          <MarketTicker />

          {/* Page Header */}
          <div className="p-6 border-b border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold">Activity</h1>
                  <p className="text-muted-foreground">
                    Your trading and transaction history
                  </p>
                </div>
              </div>

              <Button variant="outline" onClick={exportToCSV} data-testid="button-export">
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="stat-total-transactions">
                    {stats.totalTransactions}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Transactions</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600" data-testid="stat-completed-transactions">
                    {stats.completedTransactions}
                  </p>
                  <p className="text-sm text-muted-foreground">Completed</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="stat-total-volume">
                    R{stats.totalVolume.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Volume</p>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-center">
                  <p className="text-2xl font-bold" data-testid="stat-total-fees">
                    R{stats.totalFees.toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Fees</p>
                </div>
              </Card>
            </div>
          </div>

          {/* Filters */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  type="text"
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search"
                />
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger data-testid="select-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="buy">Buy</SelectItem>
                    <SelectItem value="sell">Sell</SelectItem>
                    <SelectItem value="convert">Convert</SelectItem>
                    <SelectItem value="send">Send</SelectItem>
                    <SelectItem value="receive">Receive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger data-testid="select-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="sort">Sort By</Label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger data-testid="select-sort">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="amount-high">Amount (High)</SelectItem>
                    <SelectItem value="amount-low">Amount (Low)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Transaction List */}
          <div className="flex-1">
            {isLoading ? (
              <div>
                <div className="p-4 border-b border-border bg-muted/50">
                  <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-muted rounded-full animate-pulse"></div>
                          <div className="space-y-1">
                            <div className="h-4 w-20 bg-muted rounded animate-pulse"></div>
                            <div className="h-3 w-16 bg-muted rounded animate-pulse"></div>
                          </div>
                        </div>
                        <div className="space-y-1 text-right">
                          <div className="h-4 w-16 bg-muted rounded animate-pulse"></div>
                          <div className="h-3 w-12 bg-muted rounded animate-pulse"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : isError ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-red-600">Failed to Load Transactions</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-4">
                  There was an error loading your transaction history. Please try again.
                </p>
                <Button onClick={() => window.location.reload()} variant="outline">
                  Retry
                </Button>
              </div>
            ) : filteredTransactions.length > 0 ? (
              <div>
                <div className="p-4 border-b border-border bg-muted/50">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </p>
                </div>
                <div className="max-h-[600px] overflow-y-auto">
                  {filteredTransactions.map((transaction) => (
                    <TransactionRow
                      key={transaction.id}
                      transaction={transaction}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No Transactions Found</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  {searchQuery || filterType !== 'all' || filterStatus !== 'all' 
                    ? 'No transactions match your current filters. Try adjusting your search criteria.'
                    : 'You haven\'t made any transactions yet. Start trading to see your activity here.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
